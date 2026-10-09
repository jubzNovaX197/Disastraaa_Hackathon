'use client';

import { AuthorityAccessGate } from '@/components/auth/AuthorityAccessGate';
import { DisasterMap } from '@/components/map/DisasterMap';
import { demoDataset } from '@/data/demo';
import { isAuthorizedForOperations } from '@/lib/auth/roles';
import {
  filterCommandCenterLocations
} from '@/lib/commandCenter/aggregator';
import type {
  OperationsFilters,
  PriorityLocation
} from '@/lib/commandCenter/types';
import { createCircularPolygon } from '@/lib/ingestion/risk/weatherRiskService';
import { cn } from '@/lib/utils';
import { ROLES, type Role } from '@/types/roles';
import {
  Activity,
  Clock,
  Map,
  Package,
  Shield
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { ActiveAlertsOperationsPanel } from './ActiveAlertsOperationsPanel';
import { BlockedRoadsOperationsPanel } from './BlockedRoadsOperationsPanel';
import { CitizenReportsOperationsPanel } from './CitizenReportsOperationsPanel';
import { CommandCenterHeader } from './CommandCenterHeader';
import { CommandCenterKpiRow } from './CommandCenterKpiRow';
import { DisasterIntelligenceSection } from './DisasterIntelligenceSection';
import { HazardBreakdownPanel } from './HazardBreakdownPanel';
import { LocationDetailDrawer } from './LocationDetailDrawer';
import { OperationsFiltersBar } from './OperationsFiltersBar';
import { PriorityLocationsTable } from './PriorityLocationsTable';
import { ResourceOperationsPanel } from './ResourceOperationsPanel';
import { ShelterOperationsPanel } from './ShelterOperationsPanel';
import { SituationSummaryPanel } from './SituationSummaryPanel';
import { SituationTimelineTrend } from './SituationTimelineTrend';

// Operational default map layers (Citizen reports & road disruptions visible for command response)
const COMMAND_CENTER_MAP_LAYERS = [
  { id: 'riskZones',     label: 'Risk Zones',     icon: '🔺', color: '#EF4444', enabled: true },
  { id: 'floodAreas',   label: 'Flood Areas',     icon: '🌊', color: '#3B82F6', enabled: true },
  { id: 'cycloneZones', label: 'Cyclone Zones',   icon: '🌀', color: '#A78BFA', enabled: true },
  { id: 'cycloneTrack', label: 'Cyclone Track',   icon: '🎯', color: '#7C3AED', enabled: true },
  { id: 'shelters',     label: 'Shelters',         icon: '⛺', color: '#10B981', enabled: true },
  { id: 'alerts',       label: 'Alerts',           icon: '📡', color: '#F59E0B', enabled: true },
  { id: 'infra',        label: 'Infrastructure',   icon: '🏥', color: '#22D3EE', enabled: true },
  { id: 'blockedRoads', label: 'Road Disruptions', icon: '🛣️', color: '#F97316', enabled: true },
  { id: 'reports',      label: 'Citizen Reports',  icon: '📍', color: '#8B5CF6', enabled: true },
  { id: 'historical',   label: 'Historical Events', icon: '🕐', color: '#94A3B8', enabled: false },
];

interface CommandCenterDashboardProps {
  initialRole?: Role;
}

type OperationsTab = 'situation_map' | 'priority_locations' | 'field_ops' | 'logistics' | 'trends';

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';

export function CommandCenterDashboard({
  initialRole = ROLES.STATE_AUTHORITY,
}: CommandCenterDashboardProps) {
  const [role, setRole] = useState<Role>(initialRole);
  const [activeTab, setActiveTab] = useState<OperationsTab>('situation_map');
  const [selectedLocation, setSelectedLocation] = useState<PriorityLocation | null>(null);

  // Operations filter state
  const [filters, setFilters] = useState<OperationsFilters>({
    hazard: 'ALL',
    severity: 'ALL',
    district: 'ALL',
    roadStatus: 'ALL',
    reportStatus: 'ALL',
  });

  // Real-time Intelligence stream dataset
  const { commandCenterData, overrides, refreshNow, environment } = useLiveIntelligence();
  const baseData = commandCenterData;

  // Live Map Dataset strictly respecting the environment
  const liveMapDataset = useMemo(() => {
    if (environment === 'REAL') {
      const blockedRoads = overrides.roads
        .filter((r) => r.status === 'BLOCKED' || r.status === 'CLOSED')
        .map((r) => ({
          id: r.id,
          name: r.name,
          severity: (r.status === 'CLOSED' ? 'FULL' : 'PARTIAL') as 'FULL' | 'PARTIAL',
          reason: r.travelRisk?.explanation || 'Operational roadway obstruction',
          coordinates: r.coordinates,
          since: r.lastUpdated,
        }));

      const riskZones = baseData.priorityLocations
        .filter((loc) => loc.riskScore >= 45)
        .map((loc) => ({
          id: `rz-${loc.id}`,
          name: loc.name,
          severity: loc.severity,
          coordinates: createCircularPolygon(loc.coordinates, 15),
          primaryHazard: (loc.dominantHazard === 'MULTI_HAZARD'
            ? (loc.cycloneRiskScore && loc.cycloneRiskScore > (loc.floodRiskScore ?? 0) ? 'CYCLONE' : 'FLOOD')
            : loc.dominantHazard) as 'FLOOD' | 'CYCLONE',
          riskScore: loc.riskScore,
          affectedPopulation: loc.populationExposed,
          description: `Operational Priority Sector: ${loc.severity} (${loc.riskScore}/100)`,
        }));

      const floodAreas = baseData.priorityLocations
        .filter((loc) => (loc.floodRiskScore ?? 0) >= 45)
        .map((loc) => ({
          id: `fa-${loc.id}`,
          name: `${loc.name} Hydrological Basin`,
          severity: loc.severity,
          type: 'FLOOD' as const,
          coordinates: createCircularPolygon(loc.coordinates, 10),
          areaKm2: 30,
          lastUpdated: new Date().toISOString(),
          description: `River gauge & rainfall risk: ${loc.floodRiskScore}/100`,
        }));

      return {
        riskZones,
        floodAreas,
        shelters: overrides.shelters.filter((s) => !s.id.startsWith('sh-puri-')),
        alerts: overrides.alerts.filter((a) => !a.id.startsWith('demo-')),
        infrastructure: [],
        blockedRoads,
        citizenReports: overrides.reports.filter((r) => !r.id.startsWith('demo-') && !r.id.startsWith('rep-demo-')),
        roads: overrides.roads.filter((r) => !r.id.startsWith('rd-puri-') && !r.id.startsWith('demo-')),
        cycloneZones: [],
        cycloneTrack: null,
        sourceType: 'LIVE_OPERATIONAL' as const,
        environment: 'REAL' as const,
        lastRefreshed: new Date().toISOString(),
      };
    }
    return {
      ...demoDataset,
      alerts: overrides.alerts,
      shelters: overrides.shelters,
      citizenReports: overrides.reports,
      roads: overrides.roads,
      sourceType: 'SIMULATION' as const,
      environment: 'DEMO' as const,
    };
  }, [overrides, environment, baseData.priorityLocations]);

  // Filtered priority locations
  const filteredLocations = useMemo(
    () => filterCommandCenterLocations(baseData.priorityLocations, filters),
    [baseData.priorityLocations, filters],
  );

  // Distinct districts available for filtering
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    baseData.priorityLocations.forEach((l) => set.add(l.district));
    return Array.from(set).sort();
  }, [baseData.priorityLocations]);

  // Handle role switching
  const handleRoleChange = useCallback((newRole: Role) => {
    setRole(newRole);
  }, []);

  // If user is not authorized, display clearance gate
  if (!isAuthorizedForOperations(role)) {
    return <AuthorityAccessGate currentRole={role} onClearanceGranted={handleRoleChange} />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in max-w-[1600px] mx-auto">
      {/* ── 1. Authority Header ── */}
      <CommandCenterHeader
        currentRole={role}
        activeDisastersCount={baseData.overview.activeDisasters.length}
        highestRiskLocation={baseData.overview.highestRiskLocation}
        environment={environment}
      />

      {/* ── Feed Degradation Alert Banner ── */}
      {overrides.feedErrors && Object.keys(overrides.feedErrors).length > 0 && environment === 'REAL' && (
        <div className="p-2.5 px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Operational Feeds Degraded: Upstream telemetry issue on ({Object.keys(overrides.feedErrors).join(', ')}). Serving verified database records.
            </span>
          </div>
        </div>
      )}

      {/* ── 2. Key Operational Metrics (KPIs) ── */}
      <CommandCenterKpiRow kpis={baseData.kpis} />

      {/* ── 3. Operational Situation Brief (Dynamic Narrative) ── */}
      <SituationSummaryPanel narrative={baseData.narrative} />

      {/* ── 3.1 AI Disaster Intelligence & Decision Support ── */}
      <DisasterIntelligenceSection />

      {/* ── 4. Operations Filter Bar ── */}
      <OperationsFiltersBar
        filters={filters}
        onFilterChange={setFilters}
        availableDistricts={availableDistricts}
        totalMatches={filteredLocations.length}
      />

      {/* ── 5. Operations Navigation Tabs ── */}
      <div className="flex border-b border-white/[0.08] bg-surface-card/60 backdrop-blur-md rounded-xl p-1 gap-1 overflow-x-auto">
        {[
          { id: 'situation_map', label: 'Situation Map & Priorities', icon: Map },
          { id: 'priority_locations', label: `Priority Locations (${filteredLocations.length})`, icon: Shield },
          { id: 'field_ops', label: 'Field Ops (Alerts, Roads, Reports)', icon: Activity },
          { id: 'logistics', label: 'Logistics (Shelters & Resources)', icon: Package },
          { id: 'trends', label: 'Hazard & Timeline Trends', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as OperationsTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                isActive
                  ? 'bg-accent/20 text-cyan-700 dark:text-accent shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 6. Tab Content ── */}

      {/* TAB 1: SITUATION MAP & PRIORITIES */}
      {activeTab === 'situation_map' && (
        <div className="space-y-5">
          {/* Situation Map */}
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl relative">
            <div className="h-[520px] sm:h-[620px] w-full">
              <DisasterMap
                dataset={liveMapDataset}
                environment={environment}
                initialLayers={COMMAND_CENTER_MAP_LAYERS}
                className="h-full w-full"
              />
            </div>
          </div>

          {/* Priority Locations Panel below map */}
          <PriorityLocationsTable
            locations={filteredLocations}
            selectedLocationId={selectedLocation?.id}
            onSelectLocation={setSelectedLocation}
          />
        </div>
      )}

      {/* TAB 2: PRIORITY LOCATIONS FULL VIEW */}
      {activeTab === 'priority_locations' && (
        <div className="space-y-4">
          <PriorityLocationsTable
            locations={filteredLocations}
            selectedLocationId={selectedLocation?.id}
            onSelectLocation={setSelectedLocation}
          />
        </div>
      )}

      {/* TAB 3: FIELD OPERATIONS (ALERTS, ROADS, REPORTS) */}
      {activeTab === 'field_ops' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ActiveAlertsOperationsPanel alerts={baseData.activeAlerts} />
          <BlockedRoadsOperationsPanel roadOperations={baseData.roadOperations} />
          <CitizenReportsOperationsPanel intelligence={baseData.citizenIntelligence} />
        </div>
      )}

      {/* TAB 4: LOGISTICS (SHELTERS & RESOURCES) */}
      {activeTab === 'logistics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ShelterOperationsPanel shelterOperations={baseData.shelterOperations} />
          <ResourceOperationsPanel resourceOperations={baseData.resourceOperations} />
        </div>
      )}

      {/* TAB 5: HAZARD & TIMELINE TRENDS */}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          <HazardBreakdownPanel breakdown={baseData.hazardBreakdown} />
          <SituationTimelineTrend timeline={baseData.timelineTrend} />
        </div>
      )}

      {/* ── 7. Location Detail Drawer ── */}
      <LocationDetailDrawer
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
        activeAlerts={baseData.activeAlerts}
        citizenReports={overrides.reports}
        roadSegments={overrides.roads}
      />
    </div>
  );
}
