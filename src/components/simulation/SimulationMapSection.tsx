'use client';

import { useState } from 'react';
import { Layers, Eye, ShieldAlert, Sparkles, MapPin } from 'lucide-react';
import { DisasterMap } from '@/components/map/DisasterMap';
import { demoDataset } from '@/data/demo';
import type { SimulationResult } from '@/lib/simulation/types';
import { cn } from '@/lib/utils';

interface SimulationMapSectionProps {
  result: SimulationResult;
}

const BASELINE_MAP_LAYERS = [
  { id: 'riskZones', label: 'Risk Zones', icon: '🔺', color: '#EF4444', enabled: true },
  { id: 'floodAreas', label: 'Flood Inundation', icon: '🌊', color: '#3B82F6', enabled: true },
  { id: 'cycloneZones', label: 'Cyclone Corridor', icon: '🌀', color: '#A78BFA', enabled: true },
  { id: 'shelters', label: 'Shelters', icon: '⛺', color: '#10B981', enabled: true },
  { id: 'alerts', label: 'Active Alerts', icon: '📡', color: '#F59E0B', enabled: true },
  { id: 'infra', label: 'Infrastructure', icon: '🏥', color: '#22D3EE', enabled: false },
  { id: 'blockedRoads', label: 'Road Disruptions', icon: '🛣️', color: '#F97316', enabled: true },
  { id: 'reports', label: 'Field Reports', icon: '📍', color: '#8B5CF6', enabled: false },
  { id: 'historical', label: 'Historical Records', icon: '🕐', color: '#94A3B8', enabled: false },
];

const SCENARIO_SIM_MAP_LAYERS = [
  { id: 'riskZones', label: 'Simulated Risk Envelopes', icon: '🔺', color: '#DC2626', enabled: true },
  { id: 'floodAreas', label: 'Projected Flood Overflow', icon: '🌊', color: '#2563EB', enabled: true },
  { id: 'cycloneZones', label: 'Simulated Gale Swathe', icon: '🌀', color: '#7C3AED', enabled: true },
  { id: 'shelters', label: 'Pressured Shelter Network', icon: '⛺', color: '#F59E0B', enabled: true },
  { id: 'alerts', label: 'Scenario Alert Corridors', icon: '📡', color: '#EF4444', enabled: true },
  { id: 'infra', label: 'Exposed Infrastructure', icon: '🏥', color: '#06B6D4', enabled: true },
  { id: 'blockedRoads', label: 'Impassable / Washed Roads', icon: '🛣️', color: '#EA580C', enabled: true },
  { id: 'reports', label: 'Field Reports', icon: '📍', color: '#8B5CF6', enabled: false },
  { id: 'historical', label: 'Historical Baseline', icon: '🕐', color: '#94A3B8', enabled: false },
];

export function SimulationMapSection({ result }: SimulationMapSectionProps) {
  const [mapMode, setMapMode] = useState<'current' | 'scenario'>('scenario');

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" />
            <span>Geospatial Scenario Simulation Map</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Compare verified operational footprint against simulated scenario exposure boundaries
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setMapMode('current')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all',
              mapMode === 'current'
                ? 'bg-purple-600 text-white shadow-sm font-bold ring-1 ring-purple-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08]',
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Current View</span>
          </button>
          <button
            type="button"
            onClick={() => setMapMode('scenario')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all',
              mapMode === 'scenario'
                ? 'bg-purple-600 text-white shadow-sm font-bold ring-1 ring-purple-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08]',
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scenario View</span>
          </button>
        </div>
      </div>

      {/* Mode Indicator Ribbon */}
      <div
        className={cn(
          'p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors',
          mapMode === 'scenario'
            ? 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300'
            : 'bg-slate-100 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-300',
        )}
      >
        <span className="flex items-center gap-1.5 font-medium">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          {mapMode === 'scenario'
            ? `Scenario View Active: Modeling +${result.risk.composite.delta} risk elevation across ${result.targetRegionName}`
            : 'Current Operational View: Showing real-time verified sensor and warning layers'}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider">
          {mapMode === 'scenario' ? 'Deterministic Simulation' : 'Live State'}
        </span>
      </div>

      {/* MapLibre Map Canvas */}
      <div className="relative w-full h-[480px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08]">
        <DisasterMap
          dataset={demoDataset}
          className="w-full h-full"
          center={[85.8315, 19.8005]}
          zoom={8}
          initialLayers={mapMode === 'scenario' ? SCENARIO_SIM_MAP_LAYERS : BASELINE_MAP_LAYERS}
        />
      </div>
    </div>
  );
}
