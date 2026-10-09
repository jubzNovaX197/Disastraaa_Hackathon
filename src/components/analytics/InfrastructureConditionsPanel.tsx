'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { InfrastructureAnalyticsData } from '@/lib/analytics/types';
import { cn, formatNumber } from '@/lib/utils';
import {
  AlertTriangle,
  Car,
  Home,
  Package,
  XCircle
} from 'lucide-react';
import { useState } from 'react';

interface InfrastructureConditionsPanelProps {
  infrastructure: InfrastructureAnalyticsData;
}

type SubTab = 'roads' | 'shelters' | 'resources';

export function InfrastructureConditionsPanel({
  infrastructure,
}: InfrastructureConditionsPanelProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('roads');

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3.5">
      <DataProvenance model />
      {/* Header with Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Infrastructure Conditions
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Operational status across transit, shelter capacity, and emergency stockpiles
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTab('roads')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
              activeTab === 'roads'
                ? 'bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Roads ({infrastructure.roads.totalSegments})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shelters')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
              activeTab === 'shelters'
                ? 'bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Shelters ({infrastructure.shelters.totalShelters})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
              activeTab === 'resources'
                ? 'bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Resources ({infrastructure.resources.totalCategories})</span>
          </button>
        </div>
      </div>

      {/* Tab: Roads */}
      {activeTab === 'roads' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Open</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.roads.open}</div>
              <span className="text-[9px] text-slate-400">Clear passage</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Caution</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.roads.caution}</div>
              <span className="text-[9px] text-slate-400">Potholes / Surge</span>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Partially Blocked</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.roads.partiallyBlocked}</div>
              <span className="text-[9px] text-slate-400">Single lane only</span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Blocked</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.roads.blocked}</div>
              <span className="text-[9px] text-slate-400">Full obstruction</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Closed</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.roads.closed}</div>
              <span className="text-[9px] text-slate-400">Police barricade</span>
            </div>
          </div>

          {/* Critical Disrupted Corridors */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Critical Corridors Requiring Clearance
            </span>
            <div className="space-y-1.5 mt-1.5">
              {infrastructure.roads.criticalSegments.slice(0, 3).map((seg) => (
                <div
                  key={seg.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {seg.name}
                      </span>
                      <span className="text-slate-400 text-[10px] ml-1.5">
                        ({seg.code ? `${seg.code} · ` : ''}{seg.administrativeArea})
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {seg.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Shelters */}
      {activeTab === 'shelters' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Available</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.shelters.available}</div>
              <span className="text-[9px] text-slate-400">Capacity &gt; 25% free</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pressure</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.shelters.pressure}</div>
              <span className="text-[9px] text-slate-400">80–100% capacity</span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Shortage</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.shelters.shortage}</div>
              <span className="text-[9px] text-slate-400">Deficit &gt; capacity</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total Shelters</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {infrastructure.shelters.totalShelters} sites
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total Capacity</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {formatNumber(infrastructure.shelters.totalCapacity)} beds
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Projected Demand</span>
              <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                {formatNumber(infrastructure.shelters.projectedDemand)} evacuees
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Capacity Gap</span>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {infrastructure.shelters.totalCapacityGap > 0
                  ? `-${formatNumber(infrastructure.shelters.totalCapacityGap)} beds`
                  : 'Sufficient'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Resources */}
      {activeTab === 'resources' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Adequate</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.resources.available}</div>
              <span className="text-[9px] text-slate-400">&ge; 90% coverage</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Limited</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.resources.limited}</div>
              <span className="text-[9px] text-slate-400">60–89% coverage</span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Shortage</span>
              <div className="text-lg font-extrabold mt-0.5">{infrastructure.resources.shortage}</div>
              <span className="text-[9px] text-slate-400">&lt; 60% coverage</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Categories with Critical Stockpile Deficit
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {infrastructure.resources.criticalDeficits.length > 0 ? (
                infrastructure.resources.criticalDeficits.map((name) => (
                  <span
                    key={name}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No critical deficit categories.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
