'use client';

import { Waves, Wind, Layers, AlertCircle, Building2, Car, HeartPulse, GraduationCap } from 'lucide-react';
import type { HazardAnalyticsComparison as ComparisonType, HazardMetricProfile } from '@/lib/analytics/types';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HazardAnalyticsComparisonProps {
  comparison: ComparisonType;
}

export function HazardAnalyticsComparison({ comparison }: HazardAnalyticsComparisonProps) {
  const hazards: {
    key: keyof ComparisonType;
    data: HazardMetricProfile;
    icon: typeof Waves;
    color: string;
    border: string;
    bgBadge: string;
  }[] = [
    {
      key: 'flood',
      data: comparison.flood,
      icon: Waves,
      color: 'text-blue-500 dark:text-blue-400',
      border: 'border-blue-500/20',
      bgBadge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      key: 'cyclone',
      data: comparison.cyclone,
      icon: Wind,
      color: 'text-purple-500 dark:text-purple-400',
      border: 'border-purple-500/20',
      bgBadge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      key: 'multiHazard',
      data: comparison.multiHazard,
      icon: Layers,
      color: 'text-amber-500 dark:text-amber-400',
      border: 'border-amber-500/20',
      bgBadge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Hazard Overview</span>
          <span className="text-[11px] font-normal text-slate-400">Comparative multi-hazard profile</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {hazards.map(({ key, data, icon: Icon, color, border, bgBadge }) => {
          return (
            <div
              key={key}
              className={cn(
                'p-4 rounded-xl bg-white dark:bg-surface-card border shadow-sm flex flex-col justify-between transition-all',
                border,
              )}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center border',
                        bgBadge,
                        border,
                      )}
                    >
                      <Icon className={cn('w-4 h-4', color)} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {data.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {data.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                      data.dominantSeverity === 'CRITICAL'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : data.dominantSeverity === 'HIGH'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
                    )}
                  >
                    {data.dominantSeverity}
                  </span>
                </div>

                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Average Risk
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {data.averageRisk}
                      </span>
                      <span className="text-[10px] text-slate-400">/ 100</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Peak Risk Zone
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                        {data.highestRisk}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[80px]" title={data.highestRiskLocation}>
                        {data.highestRiskLocation.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Affected Zones
                    </span>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {data.affectedAreasCount} <span className="text-[10px] font-normal text-slate-400">sectors</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Exposed Population
                    </span>
                    <div className="text-base font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 truncate">
                      {formatNumber(data.exposedPopulation)}
                    </div>
                  </div>
                </div>

                {/* Infrastructure Impact Sub-panel */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.05]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Impacted Infrastructure
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 mt-1.5 text-center">
                    <div className="p-1.5 rounded-md bg-slate-50 dark:bg-white/[0.02]">
                      <Building2 className="w-3 h-3 mx-auto text-slate-400" />
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {data.impactedInfrastructure.buildings.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-400">Structures</div>
                    </div>
                    <div className="p-1.5 rounded-md bg-slate-50 dark:bg-white/[0.02]">
                      <Car className="w-3 h-3 mx-auto text-slate-400" />
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {data.impactedInfrastructure.roadsKm} km
                      </div>
                      <div className="text-[9px] text-slate-400">Transit</div>
                    </div>
                    <div className="p-1.5 rounded-md bg-slate-50 dark:bg-white/[0.02]">
                      <HeartPulse className="w-3 h-3 mx-auto text-slate-400" />
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {data.impactedInfrastructure.hospitals}
                      </div>
                      <div className="text-[9px] text-slate-400">Hospitals</div>
                    </div>
                    <div className="p-1.5 rounded-md bg-slate-50 dark:bg-white/[0.02]">
                      <GraduationCap className="w-3 h-3 mx-auto text-slate-400" />
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {data.impactedInfrastructure.schools}
                      </div>
                      <div className="text-[9px] text-slate-400">Schools</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active alerts footer */}
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  Active Warnings:
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {data.activeAlertsCount} alerts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
