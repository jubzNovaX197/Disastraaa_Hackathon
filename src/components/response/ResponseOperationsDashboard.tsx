'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Map,
  ShieldAlert,
  Package,
  Home,
  Activity,
  Layers,
} from 'lucide-react';
import { DisasterMap } from '@/components/map/DisasterMap';
import { demoDataset } from '@/data/demo';
import { demoCitizenReports } from '@/data/demo/citizenReports';
import { demoRoadSegments } from '@/data/demo';
import { isAuthorizedForOperations } from '@/lib/auth/roles';
import { AuthorityAccessGate } from '@/components/auth/AuthorityAccessGate';
import { ResponseOperationsHeader } from './ResponseOperationsHeader';
import { OperationalOverviewBar } from './OperationalOverviewBar';
import { ResourceReadinessGrid } from './ResourceReadinessGrid';
import { ResponseZonesTable } from './ResponseZonesTable';
import { ZoneDetailPanel } from './ZoneDetailPanel';
import { ShelterOperationsSection } from './ShelterOperationsSection';
import { ResponseFilterControls } from './ResponseFilterControls';
import { buildResponseCoordinationData } from '@/lib/response/engine';
import type {
  ResponseCoordinationData,
  ResponseZoneItem,
  ResponseFilters,
  OperationalStatus,
} from '@/lib/response/types';
import { ROLES, type Role } from '@/types/roles';
import { cn } from '@/lib/utils';

// Operational response default layers
const RESPONSE_MAP_LAYERS = [
  { id: 'riskZones',     label: 'Risk Zones',     icon: '🔺', color: '#EF4444', enabled: true },
  { id: 'floodAreas',   label: 'Flood Inundation', icon: '🌊', color: '#3B82F6', enabled: true },
  { id: 'cycloneZones', label: 'Cyclone Corridor', icon: '🌀', color: '#A78BFA', enabled: true },
  { id: 'shelters',     label: 'Shelters',         icon: '⛺', color: '#10B981', enabled: true },
  { id: 'alerts',       label: 'Active Alerts',    icon: '📡', color: '#F59E0B', enabled: true },
  { id: 'infra',        label: 'Infrastructure',   icon: '🏥', color: '#22D3EE', enabled: true },
  { id: 'blockedRoads', label: 'Road Disruptions', icon: '🛣️', color: '#F97316', enabled: true },
  { id: 'reports',      label: 'Field Reports',    icon: '📍', color: '#8B5CF6', enabled: true },
  { id: 'historical',   label: 'Historical',       icon: '🕐', color: '#94A3B8', enabled: false },
];

interface ResponseOperationsDashboardProps {
  initialRole?: Role;
}

type ViewTab = 'map_and_zones' | 'resources' | 'shelters';

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';

export function ResponseOperationsDashboard({
  initialRole = ROLES.STATE_AUTHORITY,
}: ResponseOperationsDashboardProps) {
  const [role, setRole] = useState<Role>(initialRole);
  const [activeTab, setActiveTab] = useState<ViewTab>('map_and_zones');
  const [selectedZone, setSelectedZone] = useState<ResponseZoneItem | null>(null);

  // Filters state
  const [filters, setFilters] = useState<ResponseFilters>({
    resourceType: 'ALL',
    region: 'ALL',
    severity: 'ALL',
    availabilityStatus: 'ALL',
    searchQuery: '',
  });

  // Base dataset from Live Intelligence Stream
  const { responseCoordinationData, overrides, refreshNow, environment } = useLiveIntelligence();
  const baseData = responseCoordinationData;

  const liveMapDataset = useMemo(() => {
    if (environment === 'REAL') {
      return {
        riskZones: [],
        floodAreas: [],
        shelters: overrides.shelters,
        alerts: overrides.alerts,
        infrastructure: [],
        blockedRoads: [],
        citizenReports: overrides.reports,
        roads: overrides.roads,
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
  }, [overrides, environment]);

  // Mutable workflow statuses in local session state
  const [zoneStatuses, setZoneStatuses] = useState<Record<string, OperationalStatus>>(() => {
    const map: Record<string, OperationalStatus> = {};
    baseData.zones.forEach((z) => {
      map[z.id] = z.operationalStatus;
    });
    return map;
  });

  // Handle status update
  const handleStatusChange = useCallback((zoneId: string, newStatus: OperationalStatus) => {
    setZoneStatuses((prev) => ({ ...prev, [zoneId]: newStatus }));
    setSelectedZone((prev) => (prev && prev.id === zoneId ? { ...prev, operationalStatus: newStatus } : prev));
  }, []);

  // Zones enriched with current interactive status
  const enrichedZones = useMemo(() => {
    return baseData.zones.map((z) => ({
      ...z,
      operationalStatus: zoneStatuses[z.id] ?? z.operationalStatus,
    }));
  }, [baseData.zones, zoneStatuses]);

  // Distinct districts available for filtering
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    enrichedZones.forEach((z) => set.add(z.district));
    return Array.from(set).sort();
  }, [enrichedZones]);

  // Filtered zones
  const filteredZones = useMemo(() => {
    return enrichedZones.filter((zone) => {
      // Region
      if (filters.region !== 'ALL' && !zone.district.toLowerCase().includes(filters.region.toLowerCase())) {
        return false;
      }

      // Severity / Priority
      if (filters.severity !== 'ALL' && zone.priorityIndex.level !== filters.severity) {
        return false;
      }

      // Resource Type filter
      if (filters.resourceType !== 'ALL') {
        const hasGap = zone.resourceGaps.some((g) => g.category === filters.resourceType);
        if (!hasGap) return false;
      }

      // Availability Status
      if (filters.availabilityStatus !== 'ALL') {
        if (filters.availabilityStatus === 'SHORTAGE' && zone.resourceGaps.length === 0) return false;
        if (filters.availabilityStatus === 'AVAILABLE' && zone.resourceGaps.length > 0) return false;
      }

      // Search Query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchName = zone.name.toLowerCase().includes(q);
        const matchDistrict = zone.district.toLowerCase().includes(q);
        const matchGaps = zone.resourceGaps.some((g) => g.name.toLowerCase().includes(q));
        const matchHazard = zone.dominantHazard.toLowerCase().includes(q);
        if (!matchName && !matchDistrict && !matchGaps && !matchHazard) return false;
      }

      return true;
    });
  }, [enrichedZones, filters]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return baseData.resources.filter((res) => {
      if (filters.resourceType !== 'ALL' && res.category !== filters.resourceType) {
        return false;
      }
      if (filters.availabilityStatus !== 'ALL' && res.status !== filters.availabilityStatus) {
        return false;
      }
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchName = res.name.toLowerCase().includes(q);
        const matchCat = res.category.toLowerCase().includes(q);
        if (!matchName && !matchCat) return false;
      }
      return true;
    });
  }, [baseData.resources, filters]);

  // Handle role change
  const handleRoleChange = useCallback((newRole: Role) => {
    setRole(newRole);
  }, []);

  // Direct select zone from allocation view
  const handleSelectZoneById = useCallback(
    (zoneId: string) => {
      const target = enrichedZones.find((z) => z.id === zoneId);
      if (target) {
        setSelectedZone(target);
      }
    },
    [enrichedZones],
  );

  // Role clearance gate
  if (!isAuthorizedForOperations(role)) {
    return <AuthorityAccessGate currentRole={role} onClearanceGranted={handleRoleChange} />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in max-w-[1600px] mx-auto">
      {/* ── 1. Page Header ── */}
      <ResponseOperationsHeader
        currentRole={role}
        onRoleChange={handleRoleChange}
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => setFilters((prev) => ({ ...prev, searchQuery: q }))}
        onRefresh={refreshNow}
      />

      {/* ── 2. Operational Overview Bar (Top Metrics) ── */}
      <OperationalOverviewBar metrics={baseData.overview} />

      {/* ── 3. Operational Filters ── */}
      <ResponseFilterControls
        filters={filters}
        onFilterChange={setFilters}
        availableDistricts={availableDistricts}
        totalMatches={filteredZones.length}
      />

      {/* ── 4. Main View Tabs ── */}
      <div className="flex border-b border-white/[0.08] bg-surface-card/60 backdrop-blur-md rounded-xl p-1 gap-1 overflow-x-auto">
        {[
          { id: 'map_and_zones', label: `Response Map & Priority Zones (${filteredZones.length})`, icon: Map },
          { id: 'resources', label: `Resource Readiness & Allocation (${filteredResources.length})`, icon: Package },
          { id: 'shelters', label: `Shelter Evacuation Capacity (${baseData.shelters.totalShelters})`, icon: Home },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ViewTab)}
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

      {/* ── 5. Active Tab View ── */}

      {/* TAB 1: RESPONSE MAP & ZONES */}
      {activeTab === 'map_and_zones' && (
        <div className="space-y-5">
          {/* Large MapLibre Command Map (Operational Response Mode) */}
          <div className="rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl relative">
            <div className="h-[500px] sm:h-[600px] w-full">
              <DisasterMap
                dataset={liveMapDataset}
                environment={environment}
                initialLayers={RESPONSE_MAP_LAYERS}
                className="h-full w-full"
              />
            </div>
          </div>

          {/* Response Zones Table */}
          <ResponseZonesTable
            zones={filteredZones}
            selectedZoneId={selectedZone?.id}
            onSelectZone={setSelectedZone}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {/* TAB 2: RESOURCE READINESS & ALLOCATION VIEW */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <ResourceReadinessGrid
            resources={filteredResources}
            onSelectZone={handleSelectZoneById}
          />
        </div>
      )}

      {/* TAB 3: SHELTER OPERATIONS */}
      {activeTab === 'shelters' && (
        <div className="space-y-4">
          <ShelterOperationsSection shelterData={baseData.shelters} />
        </div>
      )}

      {/* ── 6. Zone Detail Panel (Drawer) ── */}
      <ZoneDetailPanel
        zone={selectedZone}
        onClose={() => setSelectedZone(null)}
        roadSegments={demoRoadSegments}
        citizenReports={demoCitizenReports}
        alerts={demoDataset.alerts}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
