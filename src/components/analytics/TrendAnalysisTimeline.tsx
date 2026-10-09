'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { TrendAnalysisPoint } from '@/lib/analytics/types';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { useState } from 'react';

interface TrendAnalysisTimelineProps {
  timeline: TrendAnalysisPoint[];
}

export function TrendAnalysisTimeline({ timeline }: TrendAnalysisTimelineProps) {
  const [selectedPointIndex, setSelectedPointIndex] = useState<number>(3); // Default to T0 (Current Operational)
  const currentPoint = timeline[selectedPointIndex] || timeline[0];

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-4">
      <DataProvenance model />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-500" />
            <span>Operational Trends</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Temporal trajectory across 48-hour operational window (Recorded history &amp; deterministic scenario model)
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-cyan-500" /> Recorded / Current
          </span>
          <span className="flex items-center gap-1 text-purple-500">
            <span className="w-2 h-2 rounded-full bg-purple-500 border border-dashed border-purple-400" /> Scenario Projection
          </span>
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className="py-8 px-4 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl space-y-1.5">
          <Clock className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No Operational Trend Records Available
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Operational trends will compute automatically as live telemetry, sensor readings, and incident reports are captured over time.
          </p>
        </div>
      ) : (
        <>
          {/* Interactive Timeline Stepper */}
          <div className="relative">
        <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-slate-200 dark:bg-white/[0.08]" />

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 relative">
          {timeline.map((point, idx) => {
            const isSelected = selectedPointIndex === idx;
            const isT0 = point.hourOffset === 0;

            return (
              <button
                key={point.timeLabel}
                type="button"
                onClick={() => setSelectedPointIndex(idx)}
                className={cn(
                  'p-2.5 rounded-xl border text-center transition-all flex flex-col justify-between relative z-10',
                  isSelected
                    ? 'ring-2 ring-cyan-500 shadow-md bg-white dark:bg-surface-card border-cyan-500'
                    : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.15]',
                  point.isScenarioDerived && !isSelected && 'border-dashed border-purple-400/40',
                )}
              >
                <div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isT0
                          ? 'bg-rose-500 animate-pulse'
                          : point.isScenarioDerived
                            ? 'bg-purple-500'
                            : 'bg-cyan-500',
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase truncate',
                        isT0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-600 dark:text-slate-400',
                      )}
                    >
                      {point.timeLabel.split(' ')[0]}
                    </span>
                  </div>

                  <div className="text-base font-extrabold text-slate-900 dark:text-white">
                    {point.riskScore}
                    <span className="text-[10px] font-normal text-slate-400">/100</span>
                  </div>
                </div>

                <div className="mt-2 pt-1 border-t border-slate-200/50 dark:border-white/[0.04] text-[9px] text-slate-400">
                  {point.isScenarioDerived ? 'Model Projection' : isT0 ? 'Current' : 'Recorded'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Point Operational Detail */}
      {currentPoint && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.07] space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {currentPoint.timeLabel}
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                  currentPoint.isScenarioDerived
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                    : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
                )}
              >
                {currentPoint.isScenarioDerived
                  ? 'Deterministic Scenario Model'
                  : 'Empirical Operational Feed'}
              </span>
            </div>

            <span className="text-[11px] text-slate-400">
              Risk Index: <strong className="text-slate-900 dark:text-white">{currentPoint.riskScore} / 100</strong>
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 italic">
            &ldquo;{currentPoint.annotation}&rdquo;
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Active Alerts</span>
              <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                {currentPoint.activeAlertsCount} warnings
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Field Reports</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {currentPoint.fieldReportsCount} reports
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Blocked Roads</span>
              <span className="font-bold text-orange-600 dark:text-orange-400 text-sm">
                {currentPoint.blockedRoadsCount} segments
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.05]">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Shelter Pressure</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                {currentPoint.shelterPressurePct}% capacity
              </span>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
