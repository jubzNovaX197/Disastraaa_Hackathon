'use client';

import type { SimulationResult } from '@/lib/simulation/types';
import { formatNumber } from '@/lib/utils';
import { Activity, ArrowRight, Home, Package, Users } from 'lucide-react';

interface ScenarioSummaryBannerProps {
  result: SimulationResult;
}

export function ScenarioSummaryBanner({ result }: ScenarioSummaryBannerProps) {
  const riskDelta = result.risk.composite.delta;
  const isElevated = riskDelta > 0;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/10 via-slate-900/5 to-indigo-900/10 dark:from-purple-950/40 dark:via-surface-card dark:to-indigo-950/40 border border-purple-500/20 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-purple-500/15">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
            {result.scenario.intensity} {result.scenario.hazard.replace('_', ' ')} · {result.scenario.duration}
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {result.targetRegionName}
          </span>
        </div>
        <span className="text-[10px] font-medium text-slate-400">
          Deterministic Scenario Output
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Risk Change */}
        <div className="p-3 rounded-lg bg-white/80 dark:bg-surface-card/90 border border-slate-200/80 dark:border-white/[0.1] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[10px] uppercase font-semibold">Simulated Risk</span>
            <Activity className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {result.risk.composite.baseline}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
              {result.risk.composite.simulated}
            </span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
              (+{riskDelta})
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Severity: {result.risk.simulatedSeverity}
          </span>
        </div>

        {/* Additional Population Exposure */}
        <div className="p-3 rounded-lg bg-white/80 dark:bg-surface-card/90 border border-slate-200/80 dark:border-white/[0.1] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[10px] uppercase font-semibold">Additional Exposure</span>
            <Users className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <div className="text-lg font-extrabold text-cyan-600 dark:text-cyan-400 mt-1">
            +{formatNumber(result.impact.population.delta)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Total Exposed: {formatNumber(result.impact.population.simulated)}
          </span>
        </div>

        {/* Shelter Capacity Gap */}
        <div className="p-3 rounded-lg bg-white/80 dark:bg-surface-card/90 border border-slate-200/80 dark:border-white/[0.1] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[10px] uppercase font-semibold">Projected Shelter Gap</span>
            <Home className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {result.shelters.projectedCapacityGap > 0
              ? `-${formatNumber(result.shelters.projectedCapacityGap)} beds`
              : 'Adequate'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Demand: {formatNumber(result.shelters.simulatedDemand)} evacuees
          </span>
        </div>

        {/* Resource Shortage Gap */}
        <div className="p-3 rounded-lg bg-white/80 dark:bg-surface-card/90 border border-slate-200/80 dark:border-white/[0.1] shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[10px] uppercase font-semibold">Primary Resource Gap</span>
            <Package className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            +{formatNumber(result.responseRequirements.additionalWater)} <span className="text-xs font-normal text-slate-400">units</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Water &amp; Ingestion Deficit
          </span>
        </div>
      </div>
    </div>
  );
}
