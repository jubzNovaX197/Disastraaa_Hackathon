'use client';

import type { SimulatedTimelineStep } from '@/lib/simulation/types';
import { cn, formatNumber } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { useState } from 'react';

interface SimulationTimelineStepperProps {
  timeline: SimulatedTimelineStep[];
}

export function SimulationTimelineStepper({ timeline }: SimulationTimelineStepperProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(3); // Default to T+24h (peak impact)
  const currentStep = timeline[selectedIdx] || timeline[0];

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span>Simulated Scenario Timeline Progression</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Deterministic temporal trajectory (T+0 through T+72h) under simulated hazard stress
          </p>
        </div>
        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
          Simulation Model Curve
        </span>
      </div>

      {/* Stepper Timeline Points */}
      <div className="relative">
        <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-slate-200 dark:bg-white/[0.08]" />

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 relative z-10">
          {timeline.map((step, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={step.stepLabel}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={cn(
                  'p-2.5 rounded-xl border text-center transition-all flex flex-col justify-between',
                  isSelected
                    ? 'ring-2 ring-purple-500 shadow-md bg-purple-50 dark:bg-purple-600/20 border-purple-500 text-purple-700 dark:text-purple-300'
                    : 'bg-slate-50 dark:bg-surface-elevated/70 border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]',
                )}
              >
                <div>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isSelected ? 'bg-purple-600 ring-2 ring-purple-400/40' : 'bg-slate-400',
                      )}
                    />
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                      {step.stepLabel}
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">
                    {step.riskScore}
                    <span className="text-[10px] font-normal text-slate-400">/100</span>
                  </div>
                </div>

                <div className="mt-2 pt-1 border-t border-slate-200/50 dark:border-white/[0.04] text-[9px] text-slate-400">
                  {step.roadPassabilityPct}% passable
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Step Details */}
      {currentStep && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {currentStep.stepLabel} Interval Analysis
            </span>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
              Risk Score: {currentStep.riskScore} / 100
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 italic">
            &ldquo;{currentStep.narrative}&rdquo;
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="p-2 rounded-lg bg-white dark:bg-surface-elevated/90 border border-slate-200/60 dark:border-white/[0.08] shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Exposed Population</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                {formatNumber(currentStep.populationExposed)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-surface-elevated/90 border border-slate-200/60 dark:border-white/[0.08] shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Shelter Demand</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                {formatNumber(currentStep.shelterDemand)} beds
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-surface-elevated/90 border border-slate-200/60 dark:border-white/[0.08] shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Resource Deficits</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                {currentStep.resourceDeficitCount} categories
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-surface-elevated/90 border border-slate-200/60 dark:border-white/[0.08] shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Road Passability</span>
              <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                {currentStep.roadPassabilityPct}% open
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
