'use client';

/**
 * Live Intelligence Context & Provider
 *
 * Provides a global real-time event streaming and operational intelligence layer
 * without requiring full page reloads.
 *
 * Source: Simulated Live Feed (Deterministic Emergency Operations Telemetry)
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import type {
  LiveEvent,
  LiveConnectionStatus,
  LiveDataOverrides,
  LiveIntelligenceContextType,
} from '@/lib/realtime/types';
import { DETERMINISTIC_LIVE_EVENTS, applyLiveEventToOverrides } from '@/lib/realtime/events';
import { aggregateCommandCenterData } from '@/lib/commandCenter/aggregator';
import { buildResponseCoordinationData } from '@/lib/response/engine';
import { buildSituationAnalyticsData } from '@/lib/analytics/engine';
import { demoDataset } from '@/data/demo';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import { demoRoadSegments } from '@/data/demo';
import { LiveIntelligenceDrawer } from '@/components/realtime/LiveIntelligenceDrawer';
import { createCitizenReport, saveReport, type CreateReportInput } from '@/lib/reports';
import {
  createIncident,
  saveIncident,
  mapReportTypeToIncidentType,
  mapReportSeverityToIncidentSeverity,
} from '@/lib/incidents';
import { ROLES } from '@/types/roles';

import type { AppEnvironment } from '@/lib/env';
import { parseEnvironmentFromCookie } from '@/lib/env';
import type { DemoAlert as Alert, Shelter } from '@/data/types';
import type { RoadSegment } from '@/lib/roads/types';
import type { NormalizedWeather } from '@/lib/weather/types';
import type { CitizenReportItem } from '@/lib/reports/types';

const REAL_OVERRIDES: LiveDataOverrides = {
  alerts: [],
  reports: [],
  roads: [],
  shelters: [],
  shelterOccupancies: {},
  resourceStocks: {},
  riverGaugeDeltas: {},
  rainfallDeltas: {},
  environment: 'REAL',
};

const DEMO_OVERRIDES: LiveDataOverrides = {
  alerts: demoDataset.alerts,
  reports: demoCitizenReports,
  roads: demoRoadSegments,
  shelters: demoDataset.shelters,
  shelterOccupancies: {},
  resourceStocks: {},
  riverGaugeDeltas: {},
  rainfallDeltas: {},
  environment: 'DEMO',
};

const LiveIntelligenceContext = createContext<LiveIntelligenceContextType | null>(null);

function getInitialEnvironment(): AppEnvironment {
  if (typeof document !== 'undefined') {
    return parseEnvironmentFromCookie(document.cookie);
  }
  return 'REAL';
}

export function LiveIntelligenceProvider({
  children,
  initialEnvironment = 'REAL',
}: {
  children: React.ReactNode;
  initialEnvironment?: AppEnvironment;
}) {
  const [environment, setEnvironment] = useState<AppEnvironment>(() => {
    if (typeof document !== 'undefined') {
      return parseEnvironmentFromCookie(document.cookie);
    }
    return initialEnvironment;
  });
  const [status, setStatus] = useState<LiveConnectionStatus>('connected');
  const sourceName = environment === 'REAL' ? 'Live Operational Feed' : 'Simulated Scenario Feed';
  const [lastSyncTime, setLastSyncTime] = useState<Date>(() => new Date());
  const [secondsSinceSync, setSecondsSinceSync] = useState<number>(0);
  const [updateIntervalSeconds, setUpdateIntervalSeconds] = useState<number>(25);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [unreadEventCount, setUnreadEventCount] = useState<number>(0);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  // Sync environment with authenticated state
  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.authenticated) {
          // Real authenticated session is strictly REAL
          setEnvironment('REAL');
        } else if (typeof document !== 'undefined') {
          const cookieEnv = parseEnvironmentFromCookie(document.cookie);
          setEnvironment(cookieEnv);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Initial recent events — empty for REAL mode, seeded for DEMO mode
  const [recentEvents, setRecentEvents] = useState<LiveEvent[]>(() => {
    const env = typeof document !== 'undefined' ? parseEnvironmentFromCookie(document.cookie) : initialEnvironment;
    if (env === 'REAL') return [];
    return DETERMINISTIC_LIVE_EVENTS.slice(0, 3).map((e, idx) => ({
      ...e,
      timeFormatted: `${(idx + 1) * 3}m ago`,
    }));
  });

  // Current event index cursor in the event stream sequence
  const eventCursorRef = useRef<number>(3);

  // Live data overrides applied on top of baseline data
  const [overrides, setOverrides] = useState<LiveDataOverrides>(() => {
    const env = typeof document !== 'undefined' ? parseEnvironmentFromCookie(document.cookie) : initialEnvironment;
    if (env === 'REAL') {
      return { ...REAL_OVERRIDES };
    }
    let current = { ...DEMO_OVERRIDES };
    for (let i = 0; i < 3; i++) {
      current = applyLiveEventToOverrides(current, DETERMINISTIC_LIVE_EVENTS[i]);
    }
    return current;
  });

  // Fetch real operational records from server endpoints
  const fetchRealData = useCallback(async () => {
    setStatus('updating');
    try {
      const [roadsRes, sheltersRes, alertsRes, weatherRes, reportsRes] = await Promise.allSettled([
        fetch('/api/roads?env=REAL').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/shelters?env=REAL').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/alerts?env=REAL').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/weather?env=REAL&regional=true').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/reports?env=REAL').then((r) => (r.ok ? r.json() : null)),
      ]);

      const roads: RoadSegment[] =
        roadsRes.status === 'fulfilled' && roadsRes.value?.success && Array.isArray(roadsRes.value.roads)
          ? roadsRes.value.roads
          : [];

      const shelters: Shelter[] =
        sheltersRes.status === 'fulfilled' && sheltersRes.value?.success && Array.isArray(sheltersRes.value.shelters)
          ? sheltersRes.value.shelters
          : [];

      const alerts: Alert[] =
        alertsRes.status === 'fulfilled' && alertsRes.value?.success && Array.isArray(alertsRes.value.alerts)
          ? alertsRes.value.alerts
          : [];

      const weatherList: NormalizedWeather[] =
        weatherRes.status === 'fulfilled' && weatherRes.value?.success && Array.isArray(weatherRes.value.data)
          ? weatherRes.value.data
          : [];

      const reports: CitizenReportItem[] =
        reportsRes.status === 'fulfilled' && reportsRes.value?.success && Array.isArray(reportsRes.value.reports)
          ? reportsRes.value.reports
          : [];

      setOverrides({
        alerts,
        reports,
        roads,
        shelters,
        shelterOccupancies: {},
        resourceStocks: {},
        riverGaugeDeltas: {},
        rainfallDeltas: {},
        weather: weatherList,
        environment: 'REAL',
      });

      setLastSyncTime(new Date());
      setSecondsSinceSync(0);
      setStatus('connected');
    } catch (err) {
      console.warn('[LIVE-CONTEXT] Operational sync error:', err);
      setStatus('delayed');
    }
  }, []);

  // Switch environment dynamically
  const switchEnvironment = useCallback((newEnv: AppEnvironment) => {
    if (typeof document !== 'undefined') {
      document.cookie = `disastraaa-env=${newEnv}; path=/; max-age=604800; SameSite=Lax`;
    }
    setEnvironment(newEnv);
    if (newEnv === 'REAL') {
      setRecentEvents([]);
      setUnreadEventCount(0);
      fetchRealData();
    } else {
      let current = { ...DEMO_OVERRIDES };
      for (let i = 0; i < 3; i++) {
        current = applyLiveEventToOverrides(current, DETERMINISTIC_LIVE_EVENTS[i]);
      }
      setOverrides(current);
      setRecentEvents(
        DETERMINISTIC_LIVE_EVENTS.slice(0, 3).map((e, idx) => ({
          ...e,
          timeFormatted: `${(idx + 1) * 3}m ago`,
        })),
      );
    }
  }, [fetchRealData]);

  // Re-sync overrides when environment state changes
  useEffect(() => {
    if (environment === 'REAL') {
      fetchRealData();
    } else {
      setOverrides((prev) => (prev.environment === 'DEMO' ? prev : { ...DEMO_OVERRIDES }));
    }
  }, [environment, fetchRealData]);

  // Calculate synchronized operational models
  const commandCenterData = useMemo(() => {
    return aggregateCommandCenterData({ ...overrides, environment });
  }, [overrides, environment]);

  const responseCoordinationData = useMemo(() => {
    return buildResponseCoordinationData(
      commandCenterData,
      {
        alerts: overrides.alerts,
        reports: overrides.reports,
        roads: overrides.roads,
        shelters: overrides.shelters,
      },
      environment,
    );
  }, [commandCenterData, overrides, environment]);

  const situationAnalyticsData = useMemo(() => {
    return buildSituationAnalyticsData(
      commandCenterData,
      overrides.alerts,
      overrides.reports,
      overrides.roads,
      environment,
    );
  }, [commandCenterData, overrides, environment]);

  // Trigger next deterministic event in the sequence
  const triggerNextEvent = useCallback(() => {
    setStatus('updating');

    const nextEventTemplate =
      DETERMINISTIC_LIVE_EVENTS[eventCursorRef.current % DETERMINISTIC_LIVE_EVENTS.length];
    eventCursorRef.current += 1;

    const eventToApply: LiveEvent = {
      ...nextEventTemplate,
      id: `${nextEventTemplate.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: 'Just now',
    };

    setTimeout(() => {
      setOverrides((prev) => applyLiveEventToOverrides(prev, eventToApply));
      setRecentEvents((prev) => [eventToApply, ...prev.slice(0, 19)]);
      setUnreadEventCount((prev) => prev + 1);
      setLastSyncTime(new Date());
      setSecondsSinceSync(0);
      setStatus((s) => (s === 'updating' ? (isPaused ? 'paused' : 'connected') : s));
    }, 180);
  }, [isPaused]);

  // Refresh current data streams now without advancing event cursor
  const refreshNow = useCallback(() => {
    setStatus('updating');
    if (environment === 'REAL') {
      fetchRealData();
      return;
    }
    setTimeout(() => {
      // Re-evaluate command center data
      setOverrides((prev) => ({ ...prev }));
      setLastSyncTime(new Date());
      setSecondsSinceSync(0);
      setStatus(isPaused ? 'paused' : 'connected');
    }, 250);
  }, [environment, fetchRealData, isPaused]);

  // Pause live stream
  const pauseFeed = useCallback(() => {
    setIsPaused(true);
    setStatus('paused');
  }, []);

  // Resume live stream
  const resumeFeed = useCallback(() => {
    setIsPaused(false);
    setStatus('connected');
    setLastSyncTime(new Date());
    setSecondsSinceSync(0);
  }, []);

  // Reset to initial baseline state
  const resetToBaseline = useCallback(() => {
    setStatus('updating');
    eventCursorRef.current = 0;
    setTimeout(() => {
      setOverrides(environment === 'REAL' ? { ...REAL_OVERRIDES } : { ...DEMO_OVERRIDES });
      setRecentEvents([]);
      setUnreadEventCount(0);
      setLastSyncTime(new Date());
      setSecondsSinceSync(0);
      setStatus(isPaused ? 'paused' : 'connected');
    }, 200);
  }, [isPaused, environment]);

  // Simulate temporary connection drop & reconnection
  const simulateConnectionDrop = useCallback(() => {
    setStatus('reconnecting');
    setTimeout(() => {
      setStatus('connected');
      setLastSyncTime(new Date());
      setSecondsSinceSync(0);
    }, 3500);
  }, []);

  // Mark recent events as read
  const markEventsRead = useCallback(() => {
    setUnreadEventCount(0);
  }, []);

  // Submit citizen report via API with local fallback
  const submitCitizenReport = useCallback(async (input: CreateReportInput) => {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }
      const { report, incident } = data;

      saveIncident(incident);

      setOverrides((prev) => ({
        ...prev,
        reports: [report, ...prev.reports.filter((r) => r.id !== report.id)],
      }));

      const newLiveEvent: LiveEvent = {
        id: `ev-report-${report.id}-${Date.now()}`,
        type: 'REPORT_RECEIVED',
        timestamp: new Date().toISOString(),
        timeFormatted: 'Just now',
        locationName: report.address || 'Field Observation',
        district: report.administrativeArea,
        title: `Citizen Report: ${report.title}`,
        summary: report.description.slice(0, 100),
        severity: report.severity,
        category: 'REPORT',
        metadata: { reportId: report.id, incidentId: incident.id },
      };

      setRecentEvents((prev) => [newLiveEvent, ...prev.slice(0, 19)]);
      setUnreadEventCount((prev) => prev + 1);
      setLastSyncTime(new Date());
      setSecondsSinceSync(0);

      return { report, incident };
    } catch (err: unknown) {
      if (environment === 'REAL') {
        // In REAL mode, never silently fall back to creating a demo/simulated report on API failure.
        // Re-throw so the submission failure state is shown to the user and their input is preserved.
        console.error('Citizen report submission failed in REAL mode:', err);
        throw err;
      }

      // Local fallback for DEMO mode only
      const report = createCitizenReport(input, demoDataset);
      saveReport(report);
      const incType = mapReportTypeToIncidentType(report.reportType);
      const incSev = mapReportSeverityToIncidentSeverity(report.severity);
      const incident = createIncident({
        title: report.title,
        description: report.description,
        incidentType: incType,
        hazardType: report.hazardType,
        severity: incSev,
        locationName: report.address,
        coordinates: report.coordinates,
        affectedArea: report.administrativeArea,
        source: 'CITIZEN_REPORT',
        sourceReference: report.id,
        dataLabel: 'CITIZEN_REPORT',
        createdBy: report.reporter.name || 'Citizen Reporter',
        createdByRole: ROLES.CITIZEN,
        relatedReportIds: [report.id],
        evidence: report.evidence,
      });
      saveIncident(incident);
      setOverrides((prev) => ({
        ...prev,
        reports: [report, ...prev.reports.filter((r) => r.id !== report.id)],
      }));
      return { report, incident };
    }
  }, [environment]);

  // Freshness second ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceSync((prev) => {
        const nextSec = prev + 1;
        // If no update for a long period and connected, flag as delayed
        if (nextSec > updateIntervalSeconds * 2.5 && status === 'connected' && !isPaused) {
          setStatus('delayed');
        }
        return nextSec;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [updateIntervalSeconds, status, isPaused]);

  // Automatic periodic live event emission — ONLY in DEMO mode
  useEffect(() => {
    if (isPaused || status !== 'connected' || environment === 'REAL') {
      return;
    }

    const interval = setInterval(() => {
      triggerNextEvent();
    }, updateIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [isPaused, status, updateIntervalSeconds, triggerNextEvent, environment]);

  const value = useMemo<LiveIntelligenceContextType>(() => {
    return {
      status,
      sourceName,
      lastSyncTime,
      secondsSinceSync,
      updateIntervalSeconds,
      isPaused,
      isDrawerOpen,
      recentEvents,
      unreadEventCount,
      overrides,
      commandCenterData,
      responseCoordinationData,
      situationAnalyticsData,
      environment,
      pauseFeed,
      resumeFeed,
      refreshNow,
      triggerNextEvent,
      resetToBaseline,
      setUpdateInterval: setUpdateIntervalSeconds,
      simulateConnectionDrop,
      markEventsRead,
      openDrawer,
      closeDrawer,
      setIsDrawerOpen,
      switchEnvironment,
      submitCitizenReport,
    };
  }, [
    status,
    sourceName,
    lastSyncTime,
    secondsSinceSync,
    updateIntervalSeconds,
    isPaused,
    isDrawerOpen,
    recentEvents,
    unreadEventCount,
    overrides,
    commandCenterData,
    responseCoordinationData,
    situationAnalyticsData,
    environment,
    pauseFeed,
    resumeFeed,
    refreshNow,
    triggerNextEvent,
    resetToBaseline,
    simulateConnectionDrop,
    markEventsRead,
    openDrawer,
    closeDrawer,
    switchEnvironment,
    submitCitizenReport,
  ]);

  return (
    <LiveIntelligenceContext.Provider value={value}>
      {children}
      {isDrawerOpen && <LiveIntelligenceDrawer onClose={closeDrawer} />}
    </LiveIntelligenceContext.Provider>
  );
}

export function useLiveIntelligence(): LiveIntelligenceContextType {
  const context = useContext(LiveIntelligenceContext);
  if (!context) {
    throw new Error('useLiveIntelligence must be used within a LiveIntelligenceProvider');
  }
  return context;
}
