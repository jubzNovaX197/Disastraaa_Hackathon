'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { SimulationResult } from '@/lib/simulation/types';
import { cn } from '@/lib/utils';
import { Bell, Car } from 'lucide-react';

interface RoadAlertSimulationPanelProps {
  result: SimulationResult;
}

export function RoadAlertSimulationPanel({ result }: RoadAlertSimulationPanelProps) {
  const roadStatus = result.roads;

  const roadCards = [
    { label: 'Passable (Open)', baseline: roadStatus.open.baseline, simulated: roadStatus.open.simulated, delta: roadStatus.open.delta, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Caution / Potholes', baseline: roadStatus.caution.baseline, simulated: roadStatus.caution.simulated, delta: roadStatus.caution.delta, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Partially Blocked', baseline: roadStatus.partiallyBlocked.baseline, simulated: roadStatus.partiallyBlocked.simulated, delta: roadStatus.partiallyBlocked.delta, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Fully Blocked', baseline: roadStatus.blocked.baseline, simulated: roadStatus.blocked.simulated, delta: roadStatus.blocked.delta, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { label: 'Authority Closed', baseline: roadStatus.closed.baseline, simulated: roadStatus.closed.simulated, delta: roadStatus.closed.delta, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <DataProvenance model source="Simulated" />
      {/* 1. Road Access Impact Simulation (7 cols) */}
      <div className="lg:col-span-7 p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Road Access &amp; Ingress Simulation
            </h3>
          </div>
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
            {roadStatus.affectedSegmentsCount} Corridors Obstructed
          </span>
        </div>

        {/* Road Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          {roadCards.map((rc, idx) => (
            <div key={idx} className={cn('p-2.5 rounded-lg border text-center', rc.bg)}>
              <div className="text-[10px] font-bold uppercase truncate">{rc.label}</div>
              <div className="text-base font-extrabold mt-1 text-slate-900 dark:text-white">
                {rc.simulated}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                Base: {rc.baseline} ({rc.delta >= 0 ? `+${rc.delta}` : rc.delta})
              </div>
            </div>
          ))}
        </div>

        {/* Impacted Corridors */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Key Corridors Projected to Experience Washout / Debris
          </span>
          <div className="space-y-1.5 mt-2">
            {roadStatus.impactedSegments.map((seg) => (
              <div
                key={seg.id}
                className="flex items-start justify-between p-2 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] text-xs shadow-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {seg.name} {seg.code ? `(${seg.code})` : ''}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{seg.reason}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap ml-2">
                  {seg.simulatedStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Simulated Alert Thresholds (5 cols) */}
      <div className="lg:col-span-5 p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Scenario Alert Conditions
            </h3>
          </div>
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            Simulated Broadcast Only
          </span>
        </div>

        <div className="space-y-2.5">
          {result.alerts.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No emergency thresholds breached under this scenario intensity.
            </div>
          ) : (
            result.alerts.map((al) => (
              <div
                key={al.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] space-y-1.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {al.title}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {al.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {al.thresholdReached}
                </p>
                <div className="pt-1 border-t border-slate-100 dark:border-white/[0.04] text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  Protocol: {al.recommendedAction}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
