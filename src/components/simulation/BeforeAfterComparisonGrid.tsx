'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { SimulationResult } from '@/lib/simulation/types';
import { formatNumber } from '@/lib/utils';
import {
  Activity,
  ArrowUpRight,
  Building2,
  Car,
  Home,
  Package,
  Users
} from 'lucide-react';

interface BeforeAfterComparisonGridProps {
  result: SimulationResult;
}

export function BeforeAfterComparisonGrid({ result }: BeforeAfterComparisonGridProps) {
  const waterRes = result.resources.find((r) => r.category === 'WATER');

  const rows = [
    {
      metric: 'Composite Risk Score',
      icon: Activity,
      baseline: `${result.risk.composite.baseline} / 100`,
      simulated: `${result.risk.composite.simulated} / 100`,
      delta: `+${result.risk.composite.delta}`,
      pct: `+${result.risk.composite.percentChange}%`,
      isNegative: true,
      sub: `Severity elevated to ${result.risk.simulatedSeverity}`,
    },
    {
      metric: 'Exposed Population',
      icon: Users,
      baseline: formatNumber(result.impact.population.baseline),
      simulated: formatNumber(result.impact.population.simulated),
      delta: `+${formatNumber(result.impact.population.delta)}`,
      pct: `+${result.impact.population.percentChange}%`,
      isNegative: true,
      sub: 'Residents in inundated / high gale zone',
    },
    {
      metric: 'Structural Assets at Risk',
      icon: Building2,
      baseline: formatNumber(result.impact.buildings.baseline),
      simulated: formatNumber(result.impact.buildings.simulated),
      delta: `+${formatNumber(result.impact.buildings.delta)}`,
      pct: `+${result.impact.buildings.percentChange}%`,
      isNegative: true,
      sub: 'Residential, commercial, and utility buildings',
    },
    {
      metric: 'Disrupted Road Network',
      icon: Car,
      baseline: `${result.impact.roadsKm.baseline} km`,
      simulated: `${result.impact.roadsKm.simulated} km`,
      delta: `+${result.impact.roadsKm.delta} km`,
      pct: `+${result.impact.roadsKm.percentChange}%`,
      isNegative: true,
      sub: `${result.roads.closed.simulated + result.roads.blocked.simulated} segments obstructed`,
    },
    {
      metric: 'Shelter Evacuee Demand',
      icon: Home,
      baseline: `${formatNumber(result.shelters.baselineDemand)} beds`,
      simulated: `${formatNumber(result.shelters.simulatedDemand)} beds`,
      delta: `+${formatNumber(result.shelters.demandDelta)}`,
      pct: `+${Math.round((result.shelters.demandDelta / Math.max(1, result.shelters.baselineDemand)) * 100)}%`,
      isNegative: true,
      sub: `Projected gap: ${formatNumber(result.shelters.projectedCapacityGap)} beds`,
    },
    {
      metric: 'Water Logistics Demand',
      icon: Package,
      baseline: `${formatNumber(waterRes?.baselineRequired ?? 0)} units`,
      simulated: `${formatNumber(waterRes?.simulatedRequired ?? 0)} units`,
      delta: `+${formatNumber(waterRes?.additionalRequired ?? 0)}`,
      pct: `+${waterRes?.baselineRequired ? Math.round(((waterRes.additionalRequired) / waterRes.baselineRequired) * 100) : 0}%`,
      isNegative: true,
      sub: `Projected stockpile gap: ${formatNumber(waterRes?.projectedGap ?? 0)} units`,
    },
  ];

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3">
      <DataProvenance model source="Simulated" />
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Before / After Operational Comparison
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Baseline real-time conditions vs. simulated scenario parameters
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/[0.08] text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              <th className="py-2.5 px-3">Operational Parameter</th>
              <th className="py-2.5 px-3">Current Conditions</th>
              <th className="py-2.5 px-3">Scenario Conditions</th>
              <th className="py-2.5 px-3 text-right">Projected Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {rows.map((r, idx) => {
              const Icon = r.icon;
              return (
                <tr
                  key={idx}
                  className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {r.metric}
                        </div>
                        <div className="text-[10px] text-slate-400">{r.sub}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">
                    {r.baseline}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                    {r.simulated}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-xs">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>{r.delta} ({r.pct})</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
