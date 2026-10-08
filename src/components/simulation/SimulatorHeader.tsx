'use client';

import { Sliders, RotateCcw, Play, Shield, Sparkles } from 'lucide-react';
import type { Role } from '@/types/roles';
import { SCENARIO_PRESETS } from '@/lib/simulation/presets';
import type { ScenarioPreset } from '@/lib/simulation/types';

interface SimulatorHeaderProps {
  role: Role;
  onRunSimulation: () => void;
  onResetScenario: () => void;
  onSelectPreset: (preset: ScenarioPreset) => void;
  onOpenComparison?: () => void;
  isRunning?: boolean;
}

export function SimulatorHeader({
  role,
  onRunSimulation,
  onResetScenario,
  onSelectPreset,
  onOpenComparison,
  isRunning = false,
}: SimulatorHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Response Simulator
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Decision Support Model
          </span>
          <span className="hidden sm:inline-flex items-center text-[10px] font-semibold text-slate-400">
            · Not a Live Forecast
          </span>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Model disaster conditions and assess potential operational impact
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Preset Selector */}
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500 hidden sm:block" />
          <select
            onChange={(e) => {
              const preset = SCENARIO_PRESETS.find((p) => p.id === e.target.value);
              if (preset) onSelectPreset(preset);
            }}
            defaultValue=""
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium cursor-pointer shadow-sm"
          >
            <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-500">
              Load Operational Preset...
            </option>
            {SCENARIO_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Compare button */}
        {onOpenComparison && (
          <button
            type="button"
            onClick={onOpenComparison}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] transition-colors"
          >
            Compare Scenarios
          </button>
        )}

        {/* Reset button */}
        <button
          type="button"
          onClick={onResetScenario}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] transition-colors border border-slate-200 dark:border-white/[0.08]"
          title="Reset to default scenario parameters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        {/* Run Simulation */}
        <button
          type="button"
          onClick={onRunSimulation}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isRunning ? 'Calculating...' : 'Run Simulation'}</span>
        </button>
      </div>
    </div>
  );
}
