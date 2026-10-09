'use client';

/**
 * MapPageClient — client entry point for the public map page.
 * Powered by common DisasterMap with dynamic data environment switching.
 */

import { DisasterMap } from '@/components/map/DisasterMap';
import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import type { DemoAlert, DisasterDataset, Shelter } from '@/data/types';
import type { RoadSegment } from '@/lib/roads/types';
import type { RealAlert } from '@/lib/alerts/types';
import { demoDataset } from '@/data/demo';
import type { AppEnvironment } from '@/lib/env';
import { cn } from '@/lib/utils';
import { Activity, Sparkles } from 'lucide-react';
import { DemoScenarioControls } from '@/components/demo/DemoScenarioControls';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface MapPageClientProps {
  initialDataset: DisasterDataset;
  environment: AppEnvironment;
}

export function MapPageClient({ initialDataset, environment }: MapPageClientProps) {
  const router = useRouter();
  const { overrides, switchEnvironment } = useLiveIntelligence();
  const [currentEnv, setCurrentEnv] = useState<AppEnvironment>(environment);
  const [isSwitching, setIsSwitching] = useState(false);
  const [modeError, setModeError] = useState('');

  // Fallback states for real operational feeds to ensure instant map rendering
  const [localShelters, setLocalShelters] = useState<Shelter[]>([]);
  const [localRoads, setLocalRoads] = useState<RoadSegment[]>([]);
  const [localAlerts, setLocalAlerts] = useState<Array<RealAlert | DemoAlert>>([]);

  useEffect(() => {
    setCurrentEnv(environment);
  }, [environment]);

  // Eagerly fetch real operational GIS fixtures when entering REAL mode
  useEffect(() => {
    if (currentEnv !== 'REAL') return;

    if (!overrides.shelters || overrides.shelters.length === 0) {
      fetch('/api/shelters?env=REAL')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.shelters)) {
            setLocalShelters(data.shelters);
          }
        })
        .catch(() => {});
    }

    if (!overrides.roads || overrides.roads.length === 0) {
      fetch('/api/roads?env=REAL')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.roads)) {
            setLocalRoads(data.roads);
          }
        })
        .catch(() => {});
    }

    if (!overrides.alerts || overrides.alerts.length === 0) {
      fetch('/api/alerts?env=REAL')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.alerts)) {
            setLocalAlerts(data.alerts);
          }
        })
        .catch(() => {});
    }
  }, [currentEnv, overrides.shelters, overrides.roads, overrides.alerts]);

  const handleToggleEnvironment = async (newEnv: AppEnvironment) => {
    if (newEnv === currentEnv || isSwitching) return;
    setIsSwitching(true);
    setModeError('');
    try {
      const response = await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: newEnv }),
      });
      if (!response.ok) throw new Error('Environment change unavailable');
      switchEnvironment(newEnv);
      setCurrentEnv(newEnv);
      router.refresh();
    } catch {
      setModeError('Could not switch data mode. Try again.');
    } finally {
      setIsSwitching(false);
    }
  };

  const liveDataset = useMemo(() => {
    if (currentEnv === 'DEMO') {
      return {
        ...demoDataset,
        riskZones: overrides.riskZones ?? initialDataset.riskZones,
        roads: overrides.roads && overrides.roads.length > 0 ? overrides.roads : demoDataset.roads,
        alerts: overrides.alerts && overrides.alerts.length > 0 ? overrides.alerts : demoDataset.alerts,
        shelters: overrides.shelters && overrides.shelters.length > 0 ? overrides.shelters : demoDataset.shelters,
        citizenReports: overrides.reports && overrides.reports.length > 0 ? overrides.reports : demoDataset.citizenReports,
      };
    }

    // In REAL mode: Resolve candidate entities with multi-tier fallback (overrides -> local eager -> initial SSR)
    const rawShelters =
      overrides.environment === 'REAL' && overrides.shelters && overrides.shelters.length > 0
        ? overrides.shelters
        : localShelters.length > 0
        ? localShelters
        : environment === 'REAL' && initialDataset.shelters
        ? initialDataset.shelters
        : [];
    const realShelters = (rawShelters ?? []).filter((s) => !s.id.startsWith('sh-puri-') && !s.id.startsWith('demo-'));

    const rawRoads =
      overrides.environment === 'REAL' && overrides.roads && overrides.roads.length > 0
        ? overrides.roads
        : localRoads.length > 0
        ? localRoads
        : environment === 'REAL' && initialDataset.roads
        ? initialDataset.roads
        : [];
    const realRoads = (rawRoads ?? []).filter((rd) => !rd.id.startsWith('rd-puri-') && !rd.id.startsWith('demo-'));

    const rawAlerts =
      overrides.environment === 'REAL' && overrides.alerts && overrides.alerts.length > 0
        ? overrides.alerts
        : localAlerts.length > 0
        ? localAlerts
        : environment === 'REAL' && initialDataset.alerts
        ? initialDataset.alerts
        : [];
    const realAlerts = (rawAlerts ?? []).filter((a) => !a.id.startsWith('demo-'));

    const rawReports =
      overrides.environment === 'REAL' && overrides.reports?.length > 0
        ? overrides.reports
        : environment === 'REAL'
        ? initialDataset.citizenReports
        : [];
    const realReports = (rawReports ?? []).filter((r) => !r.id.startsWith('demo-') && !r.id.startsWith('rep-demo-'));

    // Only render genuine elevated risk zones (filter out artificial low-risk polygons and demo scenarios)
    const candidateRiskZones =
      overrides.riskZones ?? (environment === 'REAL' ? initialDataset.riskZones : []) ?? [];
    const realRiskZones = candidateRiskZones
      .filter((rz) => !rz.id.startsWith('rz-demo-') && !rz.id.startsWith('rz-puri-'))
      .filter((rz) => rz.severity === 'HIGH' || rz.severity === 'CRITICAL' || (rz.riskScore ?? 0) >= 45);

    const candidateFloodAreas = environment === 'REAL' ? initialDataset.floodAreas : [];
    const realFloodAreas = (candidateFloodAreas ?? [])
      .filter((fa) => !fa.id.startsWith('fa-demo-') && !fa.id.startsWith('fa-puri-'))
      .filter((fa) => fa.severity === 'HIGH' || fa.severity === 'CRITICAL');

    const realBlockedRoads = realRoads
      .filter((r) => r.status === 'BLOCKED' || r.status === 'CLOSED')
      .map((r) => ({
        id: r.id,
        name: r.name,
        severity: (r.status === 'CLOSED' ? 'FULL' : 'PARTIAL') as 'FULL' | 'PARTIAL',
        reason: r.travelRisk?.explanation || 'Operational roadway obstruction',
        coordinates: r.coordinates,
        since: r.lastUpdated,
      }));

    return {
      riskZones: realRiskZones,
      floodAreas: realFloodAreas,
      infrastructure: [],
      blockedRoads: realBlockedRoads,
      cycloneZones: [],
      cycloneTrack: null,
      alerts: realAlerts,
      shelters: realShelters,
      roads: realRoads,
      citizenReports: realReports,
      environment: 'REAL' as const,
      lastRefreshed: new Date().toISOString(),
      sourceType: 'LIVE_OPERATIONAL' as const,
    };
  }, [initialDataset, environment, currentEnv, overrides, localShelters, localRoads, localAlerts]);

  return (
    <div className="relative w-full h-full">
      {/* Environment Mode Switcher (Real Mode vs Simulation) — Centered horizontally at top on desktop, integrated into mobile top bar on mobile */}
      <div className="hidden md:flex absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto items-center bg-slate-900/90 dark:bg-surface-elevated/95 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-xl max-w-[calc(100%-1rem)]">
        <button
          type="button"
          onClick={() => handleToggleEnvironment('REAL')}
          disabled={isSwitching}
          className={cn(
            'flex items-center gap-1.5 px-3 sm:px-3.5 py-1 rounded-full text-xs font-semibold transition-all',
            currentEnv === 'REAL'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200',
          )}
          title="Switch to Real Operation Mode (Live feed & real observations)"
          aria-pressed={currentEnv === 'REAL'}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="whitespace-nowrap">Real Mode</span>
        </button>

        <button
          type="button"
          onClick={() => handleToggleEnvironment('DEMO')}
          disabled={isSwitching}
          className={cn(
            'flex items-center gap-1.5 px-3 sm:px-3.5 py-1 rounded-full text-xs font-semibold transition-all',
            currentEnv === 'DEMO'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200',
          )}
          title="Switch to Demo Simulation Mode (Simulated disaster scenario)"
          aria-pressed={currentEnv === 'DEMO'}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="whitespace-nowrap">Simulation</span>
        </button>
      </div>

      {modeError && (
        <p role="alert" className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-rose-300 rounded-lg px-3 py-1.5 text-xs border border-rose-500/30 shadow-lg">
          {modeError}
        </p>
      )}

      {currentEnv === 'DEMO' && (
        <aside aria-label="Simulation scenario" className="absolute bottom-6 left-3 sm:left-4 z-20 max-w-[calc(100vw-2rem)] sm:max-w-xs md:max-w-sm pointer-events-auto">
          <DemoScenarioControls />
        </aside>
      )}

      <DisasterMap
        dataset={liveDataset}
        environment={currentEnv}
        className="w-full h-full"
        center={[85.8, 20.0]}
        zoom={7.0}
      />
    </div>
  );
}
