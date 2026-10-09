'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { AlertAnalyticsData } from '@/lib/analytics/types';
import { cn } from '@/lib/utils';
import type { Severity } from '@/types';
import { Bell, MapPin } from 'lucide-react';

interface AlertAnalyticsPanelProps {
  alertData: AlertAnalyticsData;
}

const SEVERITY_COLORS: Record<Severity, { badge: string; text: string }> = {
  CRITICAL: {
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
  },
  HIGH: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
  },
  MODERATE: {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
  },
  LOW: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
};

export function AlertAnalyticsPanel({ alertData }: AlertAnalyticsPanelProps) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-3.5">
      <DataProvenance model />
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Active Alerts
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {alertData.activeAlerts} Active
          </span>
          <span className="px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]">
            {alertData.expiredAlerts} Expired
          </span>
        </div>
      </div>

      {/* Severity Breakdown */}
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Alerts by Severity
        </span>
        <div className="grid grid-cols-4 gap-1.5 mt-1.5">
          {alertData.bySeverity.map((item) => (
            <div
              key={item.severity}
              className={cn(
                'p-2 rounded-lg border text-center',
                SEVERITY_COLORS[item.severity].badge,
              )}
            >
              <div className="text-[10px] font-bold uppercase truncate">
                {item.severity}
              </div>
              <div className="text-base font-extrabold mt-0.5">
                {item.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hazard Type Breakdown */}
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Alerts by Hazard
        </span>
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          {alertData.byHazard.map((item) => (
            <div
              key={item.hazard}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04] text-xs"
            >
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                {item.label}
              </span>
              <span className="font-bold text-slate-900 dark:text-white px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/[0.08] text-[11px]">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Regional Spread */}
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Regional Alert Distribution
        </span>
        <div className="space-y-1 mt-1.5 max-h-36 overflow-y-auto pr-1">
          {alertData.byRegion.map((r) => (
            <div
              key={r.region}
              className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-50 dark:hover:bg-white/[0.02]"
            >
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 truncate">
                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="truncate">{r.region}</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {r.count} {r.count === 1 ? 'alert' : 'alerts'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
