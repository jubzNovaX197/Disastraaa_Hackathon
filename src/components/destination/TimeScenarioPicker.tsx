'use client';

/**
 * TimeScenarioPicker — Date & Time Scenario Selector
 *
 * ⚠️  PROTOTYPE SCENARIO / DEMO FORECAST — Decision Support Prototype
 *
 * Allows users to toggle between quick disaster-timeline presets or select
 * custom dates/times to inspect time-varying travel risk and safety conditions.
 */

import { useState } from 'react';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_SCENARIOS } from '@/lib/destination/scenarios';
import type { ScenarioSlotKey, TimeRiskScenario } from '@/lib/destination/types';

interface TimeScenarioPickerProps {
  activeScenario: TimeRiskScenario;
  onSelectScenarioSlot: (slotKey: ScenarioSlotKey) => void;
  onCustomDateTimeChange?: (date: string, time: string) => void;
  className?: string;
}

const PRESET_BUTTONS: Array<{
  key: ScenarioSlotKey;
  label: string;
  badge?: string;
  color?: string;
}> = [
  { key: 'NOW', label: 'Now', badge: 'Live Sim' },
  { key: 'TODAY_12', label: 'Today 12:00' },
  { key: 'TODAY_15', label: 'Today 15:00', badge: 'Squall' },
  { key: 'TODAY_18', label: 'Today 18:00', badge: 'Landfall', color: 'text-rose-500' },
  { key: 'TODAY_21', label: 'Today 21:00', badge: 'Dam Peak' },
  { key: 'TOMORROW_06', label: 'Tmrw 06:00' },
  { key: 'TOMORROW_12', label: 'Tmrw 12:00', badge: 'Receding' },
  { key: 'TOMORROW_18', label: 'Tmrw 18:00' },
  { key: 'FUTURE_48H', label: '+48h Future', badge: 'Clear' },
];

export function TimeScenarioPicker({
  activeScenario,
  onSelectScenarioSlot,
  onCustomDateTimeChange,
  className,
}: TimeScenarioPickerProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customDate, setCustomDate] = useState(activeScenario.targetDate);
  const [customTime, setCustomTime] = useState(activeScenario.targetTime);

  const handleApplyCustom = () => {
    if (onCustomDateTimeChange) {
      onCustomDateTimeChange(customDate, customTime);
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card p-4 space-y-3.5 shadow-md backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/5',
        className
      )}
    >
      {/* Header with Professional notice */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>Date &amp; Time Travel Risk Horizon</span>
        </div>
        <div className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25">
          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
          <span>Temporal Forecast Simulation Model</span>
        </div>
      </div>

      {/* Preset Pills */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_BUTTONS.map((btn) => {
          const isSelected = !isCustomMode && activeScenario.slotKey === btn.key;
          return (
            <button
              key={btn.key}
              type="button"
              onClick={() => {
                setIsCustomMode(false);
                onSelectScenarioSlot(btn.key);
              }}
              className={cn(
                'px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all border flex items-center gap-1.5',
                isSelected
                  ? 'bg-accent text-slate-950 border-accent font-bold shadow-sm ring-1 ring-accent/40'
                  : 'bg-slate-100 dark:bg-surface-elevated text-slate-800 dark:text-slate-200 border-slate-300 dark:border-white/15 hover:bg-slate-200 dark:hover:bg-surface-overlay shadow-xs'
              )}
            >
              <span>{btn.label}</span>
              {btn.badge && (
                <span
                  className={cn(
                    'text-[9px] px-1 py-0.2 rounded font-mono',
                    isSelected
                      ? 'bg-black/20 text-slate-950 font-bold'
                      : 'bg-slate-200 dark:bg-surface-overlay text-slate-600 dark:text-slate-300'
                  )}
                >
                  {btn.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsCustomMode(!isCustomMode)}
          className={cn(
            'px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5',
            isCustomMode
              ? 'bg-accent text-slate-950 border-accent font-bold shadow-sm'
              : 'bg-slate-100 dark:bg-surface-elevated text-slate-700 dark:text-slate-300 border-dashed border-slate-300 dark:border-white/20 hover:bg-slate-200 dark:hover:bg-surface-overlay'
          )}
        >
          <Calendar className="w-3 h-3" />
          <span>Custom...</span>
        </button>
      </div>

      {/* Custom Date/Time input dropdown if toggled */}
      {isCustomMode && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-elevated border border-slate-200 dark:border-white/10 flex flex-wrap items-center gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Date:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-surface-base text-slate-900 dark:text-slate-100 text-xs font-medium"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Time:</span>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-surface-base text-slate-900 dark:text-slate-100 text-xs font-medium"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyCustom}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-accent text-slate-950 hover:bg-accent/90 shadow-sm"
          >
            Apply Custom Time
          </button>
        </div>
      )}

      {/* Active scenario description bar */}
      <div className="px-3.5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-surface-elevated/80 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2 border border-slate-200 dark:border-white/10">
        <div className="w-2 h-2 rounded-full bg-accent mt-1 flex-shrink-0" />
        <div className="flex-1">
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {activeScenario.label}:
          </span>{' '}
          {activeScenario.scenarioSummary}
        </div>
      </div>
    </div>
  );
}
