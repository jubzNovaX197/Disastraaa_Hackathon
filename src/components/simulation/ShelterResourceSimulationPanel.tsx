'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { SimulationResult } from '@/lib/simulation/types';
import { cn, formatNumber } from '@/lib/utils';
import { Home, Package } from 'lucide-react';

interface ShelterResourceSimulationPanelProps {
  result: SimulationResult;
}

export function ShelterResourceSimulationPanel({
  result,
}: ShelterResourceSimulationPanelProps) {
  const shelterSummary = result.shelters;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <DataProvenance model source="Simulated" />
      {/* 1. Shelter Operations Simulation (5 cols) */}
      <div className="lg:col-span-5 p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Shelter Operations Simulation
            </h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">
            Projected Scenario Demand
          </span>
        </div>

        {/* Shelter KPI Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Verified Capacity</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
              {formatNumber(shelterSummary.totalCapacity)} beds
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Projected Scenario Demand</span>
            <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm">
              {formatNumber(shelterSummary.simulatedDemand)} evacuees
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Incremental Evacuees</span>
            <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
              +{formatNumber(shelterSummary.demandDelta)} beds
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Projected Capacity Gap</span>
            <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">
              {shelterSummary.projectedCapacityGap > 0
                ? `-${formatNumber(shelterSummary.projectedCapacityGap)} beds`
                : 'Zero Deficit'}
            </span>
          </div>
        </div>

        {/* High-Pressure Shelters List */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Shelters Under Projected Stress
          </span>
          <div className="space-y-1.5 mt-2 max-h-56 overflow-y-auto pr-1">
            {shelterSummary.items.map((sh) => (
              <div
                key={sh.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] text-xs shadow-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {sh.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Cap: {sh.capacity} · Demand: {sh.simulatedDemand}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {sh.projectedGap > 0 && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                      -{sh.projectedGap}
                    </span>
                  )}
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                      sh.simulatedStatus === 'SHORTAGE'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : sh.simulatedStatus === 'PRESSURE'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    )}
                  >
                    {sh.simulatedStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Resource Operations Simulation (7 cols) */}
      <div className="lg:col-span-7 p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Resource Readiness &amp; Gaps Simulation
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            Operational Stockpile Deficits
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.08] text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                <th className="py-2 px-2.5">Category</th>
                <th className="py-2 px-2.5">Current Req</th>
                <th className="py-2 px-2.5">Scenario Req</th>
                <th className="py-2 px-2.5">Additional</th>
                <th className="py-2 px-2.5">Stockpile</th>
                <th className="py-2 px-2.5 text-right">Projected Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {result.resources.map((res) => {
                const hasGap = res.projectedGap > 0;
                return (
                  <tr key={res.category} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 px-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{res.icon}</span>
                        <span>{res.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-500 dark:text-slate-400">
                      {formatNumber(res.baselineRequired)}
                    </td>
                    <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white">
                      {formatNumber(res.simulatedRequired)}
                    </td>
                    <td className="py-2.5 px-2.5 font-semibold text-amber-600 dark:text-amber-400">
                      +{formatNumber(res.additionalRequired)}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-300">
                      {formatNumber(res.availableStock)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-extrabold">
                      {hasGap ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          -{formatNumber(res.projectedGap)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          Covered
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
