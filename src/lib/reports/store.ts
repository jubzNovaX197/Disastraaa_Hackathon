/**
 * Citizen Report Store
 *
 * In-memory persistence layer for Citizen Disaster Reports.
 * Provides unified access across server API routes and client hydration.
 *
 * Seeded with realistic demo citizen ground observations.
 */

import { demoCitizenReports } from '@/data/demo/citizenReports';
import type { CitizenReportItem } from './types';
import type { AppEnvironment } from '@/lib/env';

// Global singletons across server runtime — strictly separated
let _realReportsStore: CitizenReportItem[] = [];
let _demoReportsStore: CitizenReportItem[] = [...demoCitizenReports];

export function getAllReports(env: AppEnvironment = 'REAL'): CitizenReportItem[] {
  return env === 'DEMO' ? _demoReportsStore : _realReportsStore;
}

export function getReportById(id: string, env: AppEnvironment = 'REAL'): CitizenReportItem | undefined {
  const store = env === 'DEMO' ? _demoReportsStore : _realReportsStore;
  return store.find((r) => r.id === id);
}

export function saveReport(report: CitizenReportItem, env: AppEnvironment = 'REAL'): void {
  if (env === 'DEMO') {
    const idx = _demoReportsStore.findIndex((r) => r.id === report.id);
    if (idx >= 0) {
      _demoReportsStore = [
        ..._demoReportsStore.slice(0, idx),
        report,
        ..._demoReportsStore.slice(idx + 1),
      ];
    } else {
      _demoReportsStore = [report, ..._demoReportsStore];
    }
  } else {
    const idx = _realReportsStore.findIndex((r) => r.id === report.id);
    if (idx >= 0) {
      _realReportsStore = [
        ..._realReportsStore.slice(0, idx),
        report,
        ..._realReportsStore.slice(idx + 1),
      ];
    } else {
      _realReportsStore = [report, ..._realReportsStore];
    }
    // Register real geographic region dynamically
    try {
      const { registerRealOperationalLocation, parseLocationFromText } = require('@/lib/geo');
      const parsed = parseLocationFromText(report.administrativeArea || report.address);
      registerRealOperationalLocation({
        district: parsed.district,
        state: parsed.state,
        coordinates: report.coordinates,
        locality: report.address,
        source: 'REPORT',
        environment: 'REAL',
      });
    } catch {
      // ignore
    }
  }
}

export function getReportCounts(env: AppEnvironment = 'REAL') {
  const store = env === 'DEMO' ? _demoReportsStore : _realReportsStore;
  const total = store.length;
  const verified = store.filter((r) => r.status === 'VERIFIED').length;
  const underReview = store.filter(
    (r) => r.status === 'UNDER_REVIEW' || r.status === 'PENDING',
  ).length;
  const communityConfirmed = store.filter(
    (r) => r.status === 'COMMUNITY_CONFIRMED',
  ).length;
  const escalated = store.filter((r) => r.status === 'ESCALATED').length;
  const withEvidence = store.filter(
    (r) => r.evidence && r.evidence.length > 0,
  ).length;

  return {
    total,
    verified,
    underReview,
    communityConfirmed,
    escalated,
    withEvidence,
  };
}

export function _resetRealReportsForTesting(): void {
  _realReportsStore = [];
}

