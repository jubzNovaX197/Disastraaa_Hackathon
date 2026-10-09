'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { HistoricalComparisonData } from '@/lib/analytics/types';
import { cn, formatNumber } from '@/lib/utils';
import { AlertCircle, Building2, Calendar, History, Users } from 'lucide-react';

interface HistoricalComparisonSectionProps {
  historicalData: HistoricalComparisonData;
}

export function HistoricalComparisonSection({
  historicalData,
}: HistoricalComparisonSectionProps) {
  const isElevated =
    historicalData.currentRiskRelativeElevation === 'SIGNIFICANTLY_ELEVATED' ||
    historicalData.currentRiskRelativeElevation === 'ELEVATED';

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-4">
      <DataProvenance model />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-500" />
            <span>Historical Context</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Current situation benchmarked against 10-year empirical disaster records
          </p>
        </div>

        <span
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border self-start sm:self-auto',
            isElevated
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          )}
        >
          {historicalData.currentRiskRelativeElevation.replace('_', ' ')}
        </span>
      </div>

      {historicalData.matchedEventsCount === 0 ? (
        <div className="py-6 px-4 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl space-y-1">
          <History className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No Historical Baseline Data Available
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            {historicalData.comparativeInsight}
          </p>
        </div>
      ) : (
        <>
          {/* Primary Comparison Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-semibold">Annual Frequency</span>
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                ~{historicalData.historicalAnnualFrequency} <span className="text-xs font-normal text-slate-400">events/yr</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Based on {historicalData.matchedEventsCount} regional records
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-semibold">Dominant History</span>
                <History className="w-3.5 h-3.5" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                {historicalData.historicalAverageSeverity}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Most frequent disaster pattern
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-semibold">Historical Avg Pop</span>
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {formatNumber(historicalData.historicalAvgPopulation)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Ratio: <strong>{historicalData.currentExposedVsHistoricalAvgRatio}x</strong> of mean
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-semibold">Historical Avg Damage</span>
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {formatNumber(historicalData.historicalAvgBuildings)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Structures impacted per event
              </p>
            </div>
          </div>

          {/* Synthesis Insight */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {historicalData.comparativeInsight}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
