'use client';

/**
 * DestinationTimeline — Scenario Safety Progression
 *
 * ⚠️  PROTOTYPE SCENARIO TIMELINE — Decision Support Prototype
 *     Values are deterministically modeled from scenario disaster inputs.
 */

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { DestinationSafetyResult, DestinationSafetyStatus } from '@/lib/destination/types';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface DestinationTimelineProps {
  timeline: DestinationSafetyResult['timeline'];
  activeTime?: string;
  onSelectTime?: (time: string, date: string) => void;
  className?: string;
}

const STATUS_STYLE: Record<
  DestinationSafetyStatus,
  { text: string; bg: string; border: string; bar: string }
> = {
  SAFE: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    border: 'border-emerald-500/35 dark:border-emerald-500/40',
    bar: 'bg-emerald-500',
  },
  CAUTION: {
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    border: 'border-amber-500/35 dark:border-amber-500/40',
    bar: 'bg-amber-500',
  },
  HIGH_RISK: {
    text: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    border: 'border-orange-500/35 dark:border-orange-500/40',
    bar: 'bg-orange-500',
  },
  CRITICAL: {
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    border: 'border-rose-500/35 dark:border-rose-500/40',
    bar: 'bg-rose-500',
  },
};

export function DestinationTimeline({
  timeline,
  activeTime,
  onSelectTime,
  className,
}: DestinationTimelineProps) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card p-4 space-y-3.5 backdrop-blur-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5',
        className
      )}
    >
      <DataProvenance model />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>Destination Safety Timeline</span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Temporal Progression (9 Horizons)
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2.5 pt-1 -mx-1 px-1 scrollbar-thin">
        {timeline.map((item) => {
          const style = STATUS_STYLE[item.status];
          const isSelected = activeTime === item.time;

          return (
            <button
              key={`${item.date}-${item.time}`}
              type="button"
              onClick={() => onSelectTime?.(item.time, item.date)}
              className={cn(
                'min-w-[145px] max-w-[170px] flex-shrink-0 p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between group cursor-pointer backdrop-blur-md',
                isSelected
                  ? 'ring-2 ring-accent border-accent bg-accent/15 dark:bg-accent/25 shadow-md scale-[1.02]'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-surface-elevated/70 hover:bg-slate-50 dark:hover:bg-surface-elevated shadow-xs'
              )}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1">
                  <span>{item.date}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {item.time}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                  <span className={cn('text-2xl font-black', style.text)}>
                    {item.score}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">/100</span>
                </div>

                {/* Status Badge */}
                <div
                  className={cn(
                    'mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded border',
                    style.bg,
                    style.border,
                    style.text
                  )}
                >
                  {item.status.replace('_', ' ')}
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="h-1.5 w-full bg-slate-200 dark:bg-surface-overlay rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', style.bar)}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-1 truncate font-medium" title={item.summary}>
                  {item.summary}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
