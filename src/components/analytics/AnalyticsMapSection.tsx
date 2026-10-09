'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import { DisasterMap } from '@/components/map/DisasterMap';
import { demoDataset } from '@/data/demo';
import type { RegionalAnalyticsRow } from '@/lib/analytics/types';
import { Layers, MapPin } from 'lucide-react';

interface AnalyticsMapSectionProps {
  selectedLocation: RegionalAnalyticsRow | null;
  onClearSelection?: () => void;
}

const ANALYTICS_MAP_LAYERS = [
  { id: 'riskZones',     label: 'Risk Zones',     icon: '🔺', color: '#EF4444', enabled: true },
  { id: 'floodAreas',   label: 'Flood Inundation', icon: '🌊', color: '#3B82F6', enabled: true },
  { id: 'cycloneZones', label: 'Cyclone Corridor', icon: '🌀', color: '#A78BFA', enabled: true },
  { id: 'shelters',     label: 'Shelters',         icon: '⛺', color: '#10B981', enabled: true },
  { id: 'alerts',       label: 'Active Alerts',    icon: '📡', color: '#F59E0B', enabled: true },
  { id: 'infra',        label: 'Infrastructure',   icon: '🏥', color: '#22D3EE', enabled: true },
  { id: 'blockedRoads', label: 'Road Disruptions', icon: '🛣️', color: '#F97316', enabled: true },
  { id: 'reports',      label: 'Field Reports',    icon: '📍', color: '#8B5CF6', enabled: true },
  { id: 'historical',   label: 'Historical Records', icon: '🕐', color: '#94A3B8', enabled: false },
];

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';

export function AnalyticsMapSection({
  selectedLocation,
  onClearSelection,
}: AnalyticsMapSectionProps) {
  const { environment, overrides } = useLiveIntelligence();

  const dataset = environment === 'REAL' ? {
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
  } : demoDataset;

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3">
      <DataProvenance model />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-500" />
            <span>Multi-Hazard Geospatial Intelligence</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Interactive MapLibre operational response view synchronized with situation analytics
          </p>
        </div>

        {selectedLocation && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
              <MapPin className="w-3.5 h-3.5 text-cyan-500" />
              Focus: <strong>{selectedLocation.name}</strong>
            </span>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Reset Focus
              </button>
            )}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[480px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08]">
        <DisasterMap
          dataset={dataset}
          environment={environment}
          className="w-full h-full"
          center={selectedLocation ? selectedLocation.coordinates : [85.8315, 19.8005]}
          zoom={selectedLocation ? 9.5 : 7.8}
          initialLayers={ANALYTICS_MAP_LAYERS}
        />
      </div>
    </div>
  );
}
