'use client';

import { Users, Building2, Car, HeartPulse, GraduationCap, Home, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { ImpactAnalyticsData, ImpactAnalyticsMetric } from '@/lib/analytics/types';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ImpactAnalyticsPanelProps {
  impact: ImpactAnalyticsData;
}

export function ImpactAnalyticsPanel({ impact }: ImpactAnalyticsPanelProps) {
  const metrics: {
    key: keyof Omit<ImpactAnalyticsData, 'synthesisNote'>;
    data: ImpactAnalyticsMetric;
    icon: typeof Users;
  }[] = [
    { key: 'population', data: impact.population, icon: Users },
    { key: 'buildings', data: impact.buildings, icon: Building2 },
    { key: 'roadsKm', data: impact.roadsKm, icon: Car },
    { key: 'hospitals', data: impact.hospitals, icon: HeartPulse },
    { key: 'schools', data: impact.schools, icon: GraduationCap },
    { key: 'shelters', data: impact.shelters, icon: Home },
  ];

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span>Impact Assessment</span>
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              Model Projections & Verified Data
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Physical asset exposure vs confirmed ground damage
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {metrics.map(({ key, data, icon: Icon }) => (
          <div
            key={key}
            className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4 text-cyan-500" />
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300">
                  {data.confidenceRating}
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-2 truncate">
                {data.label}
              </div>

              {/* Projected / Modeled */}
              <div className="mt-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Projected:
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatNumber(data.projectedValue)}{' '}
                  <span className="text-[10px] font-normal text-slate-400">{data.unit}</span>
                </span>
              </div>

              {/* Verified */}
              <div className="mt-1 pt-1 border-t border-slate-200/60 dark:border-white/[0.04]">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Verified:
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {data.verifiedValue !== null
                    ? `${formatNumber(data.verifiedValue)} ${data.unit}`
                    : 'Pending census'}
                </span>
              </div>
            </div>

            <div className="mt-2 text-[9px] text-slate-400 line-clamp-2" title={data.note}>
              {data.note}
            </div>
          </div>
        ))}
      </div>

      <div className="p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          {impact.synthesisNote}
        </p>
      </div>
    </div>
  );
}
