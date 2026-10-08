'use client';

import {
  Activity,
  Waves,
  Wind,
  Layers,
  ArrowRight,
  Building2,
  Users,
  Car,
  HeartPulse,
  GraduationCap,
  Home,
  CheckCircle2,
} from 'lucide-react';
import type { SimulationResult } from '@/lib/simulation/types';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface RiskImpactSimulationPanelProps {
  result: SimulationResult;
}

export function RiskImpactSimulationPanel({ result }: RiskImpactSimulationPanelProps) {
  const riskHazards = [
    {
      title: 'Composite Risk',
      data: result.risk.composite,
      icon: Activity,
      color: 'text-purple-500',
    },
    {
      title: 'Flood Hazard',
      data: result.risk.flood,
      icon: Waves,
      color: 'text-blue-500',
    },
    {
      title: 'Cyclone Hazard',
      data: result.risk.cyclone,
      icon: Wind,
      color: 'text-purple-400',
    },
    {
      title: 'Multi-Hazard System',
      data: result.risk.multiHazard,
      icon: Layers,
      color: 'text-amber-500',
    },
  ];

  const impactMetrics = [
    { label: 'Exposed Population', icon: Users, data: result.impact.population, unit: 'people' },
    { label: 'Structural Assets', icon: Building2, data: result.impact.buildings, unit: 'buildings' },
    { label: 'Disrupted Roads', icon: Car, data: result.impact.roadsKm, unit: 'km' },
    { label: 'Educational Centers', icon: GraduationCap, data: result.impact.schools, unit: 'schools' },
    { label: 'Critical Health Care', icon: HeartPulse, data: result.impact.hospitals, unit: 'hospitals' },
    { label: 'Active Shelters', icon: Home, data: result.impact.shelters, unit: 'shelters' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Risk Response & Causal Drivers */}
      <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Risk Response &amp; Drivers
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase">
            {result.risk.simulatedSeverity} Tier
          </span>
        </div>

        {/* Hazard Risk Rows */}
        <div className="grid grid-cols-2 gap-2">
          {riskHazards.map((h, idx) => {
            const Icon = h.icon;
            return (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] shadow-xs"
              >
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="text-[10px] uppercase font-semibold">{h.title}</span>
                  <Icon className={cn('w-3.5 h-3.5', h.color)} />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {h.data.baseline}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {h.data.simulated}
                  </span>
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                    (+{h.data.delta})
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Causal Factors */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Primary Factors Driving Risk Elevation
          </span>
          <div className="space-y-1.5 mt-2">
            {result.risk.keyDrivers.map((driver, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-700 dark:text-slate-200 shadow-xs"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                <span className="leading-relaxed">{driver}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Impact Simulation Breakdown */}
      <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Impact Assessment Simulation
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            Physical Asset Exposure
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {impactMetrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-surface-elevated/70 border border-slate-200/80 dark:border-white/[0.08] flex flex-col justify-between shadow-xs"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] uppercase font-semibold truncate">
                    {item.label}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                </div>

                <div className="mt-2">
                  <div className="flex items-baseline gap-1 text-slate-900 dark:text-white font-extrabold text-sm">
                    <span>{formatNumber(item.data.simulated)}</span>
                    <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Base: {formatNumber(item.data.baseline)}</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      +{formatNumber(item.data.delta)}
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-1 border-t border-slate-200/50 dark:border-white/[0.04] text-[9px] font-semibold text-rose-600 dark:text-rose-400">
                  +{item.data.percentChange}% change
                </div>
              </div>
            );
          })}
        </div>

        {/* Operational Narrative */}
        <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10 text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
          &ldquo;{result.synthesisNarrative}&rdquo;
        </div>
      </div>
    </div>
  );
}
