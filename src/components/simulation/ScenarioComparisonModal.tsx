'use client';

import { runSimulation } from '@/lib/simulation/engine';
import { SCENARIO_PRESETS } from '@/lib/simulation/presets';
import type { SimulationResult } from '@/lib/simulation/types';
import { cn, formatNumber } from '@/lib/utils';
import { Sliders, X } from 'lucide-react';
import { useState } from 'react';

interface ScenarioComparisonModalProps {
  currentResult: SimulationResult;
  onClose: () => void;
}

export function ScenarioComparisonModal({
  currentResult,
  onClose,
}: ScenarioComparisonModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    SCENARIO_PRESETS.find((p) => p.hazard !== currentResult.scenario.hazard)?.id ??
      SCENARIO_PRESETS[0].id,
  );

  const comparisonPreset =
    SCENARIO_PRESETS.find((p) => p.id === selectedPresetId) ?? SCENARIO_PRESETS[0];

  const comparisonResult = runSimulation({
    id: comparisonPreset.id,
    name: comparisonPreset.name,
    hazard: comparisonPreset.hazard,
    intensity: comparisonPreset.intensity,
    duration: comparisonPreset.duration,
    targetRegionId: comparisonPreset.targetRegionId,
    populationExposureMultiplier: 1.0,
    advanced: comparisonPreset.advanced,
  });

  const comparisonMetrics = [
    {
      label: 'Composite Risk Score',
      valA: `${currentResult.risk.composite.simulated} / 100`,
      valB: `${comparisonResult.risk.composite.simulated} / 100`,
      diff: comparisonResult.risk.composite.simulated - currentResult.risk.composite.simulated,
    },
    {
      label: 'Exposed Population',
      valA: formatNumber(currentResult.impact.population.simulated),
      valB: formatNumber(comparisonResult.impact.population.simulated),
      diff: comparisonResult.impact.population.simulated - currentResult.impact.population.simulated,
    },
    {
      label: 'Impacted Buildings',
      valA: formatNumber(currentResult.impact.buildings.simulated),
      valB: formatNumber(comparisonResult.impact.buildings.simulated),
      diff: comparisonResult.impact.buildings.simulated - currentResult.impact.buildings.simulated,
    },
    {
      label: 'Disrupted Roads (km)',
      valA: `${currentResult.impact.roadsKm.simulated} km`,
      valB: `${comparisonResult.impact.roadsKm.simulated} km`,
      diff: Math.round((comparisonResult.impact.roadsKm.simulated - currentResult.impact.roadsKm.simulated) * 10) / 10,
    },
    {
      label: 'Shelter Evacuee Demand',
      valA: `${formatNumber(currentResult.shelters.simulatedDemand)} beds`,
      valB: `${formatNumber(comparisonResult.shelters.simulatedDemand)} beds`,
      diff: comparisonResult.shelters.simulatedDemand - currentResult.shelters.simulatedDemand,
    },
    {
      label: 'Shelter Capacity Gap',
      valA: `${formatNumber(currentResult.shelters.projectedCapacityGap)} beds`,
      valB: `${formatNumber(comparisonResult.shelters.projectedCapacityGap)} beds`,
      diff: comparisonResult.shelters.projectedCapacityGap - currentResult.shelters.projectedCapacityGap,
    },
    {
      label: 'Additional Water Logistics',
      valA: `${formatNumber(currentResult.responseRequirements.additionalWater)} units`,
      valB: `${formatNumber(comparisonResult.responseRequirements.additionalWater)} units`,
      diff: comparisonResult.responseRequirements.additionalWater - currentResult.responseRequirements.additionalWater,
    },
    {
      label: 'Obstructed Roads Count',
      valA: `${currentResult.roads.blocked.simulated + currentResult.roads.closed.simulated} segments`,
      valB: `${comparisonResult.roads.blocked.simulated + comparisonResult.roads.closed.simulated} segments`,
      diff:
        comparisonResult.roads.blocked.simulated +
        comparisonResult.roads.closed.simulated -
        (currentResult.roads.blocked.simulated + currentResult.roads.closed.simulated),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Dual Scenario Comparison
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Evaluate divergence between current configuration and alternative hazard scenario
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Header comparison row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                Scenario A (Current Setup)
              </span>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                {currentResult.scenario.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {currentResult.scenario.intensity} {currentResult.scenario.hazard} · {currentResult.scenario.duration}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Scenario B (Benchmark Comparison)
                </span>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="text-[11px] px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-500/30 text-slate-800 dark:text-slate-100 font-medium cursor-pointer shadow-sm"
                >
                  {SCENARIO_PRESETS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                {comparisonPreset.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {comparisonPreset.intensity} {comparisonPreset.hazard} · {comparisonPreset.duration}
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/[0.08] text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                  <th className="py-2.5 px-3">Metric</th>
                  <th className="py-2.5 px-3">Scenario A</th>
                  <th className="py-2.5 px-3">Scenario B</th>
                  <th className="py-2.5 px-3 text-right">Variance (B vs A)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {comparisonMetrics.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {m.label}
                    </td>
                    <td className="py-2.5 px-3 text-purple-700 dark:text-purple-300 font-medium">
                      {m.valA}
                    </td>
                    <td className="py-2.5 px-3 text-indigo-700 dark:text-indigo-300 font-bold">
                      {m.valB}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px]',
                          m.diff > 0
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : m.diff < 0
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400',
                        )}
                      >
                        {m.diff > 0 ? `+${formatNumber(m.diff)}` : formatNumber(m.diff)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-white/[0.08] flex justify-end bg-slate-50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
