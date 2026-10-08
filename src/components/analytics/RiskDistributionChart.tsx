'use client';

import type { RiskDistributionData, SeverityDistributionBucket } from '@/lib/analytics/types';
import type { Severity } from '@/types';
import { cn } from '@/lib/utils';

interface RiskDistributionChartProps {
  distribution: RiskDistributionData;
  selectedSeverity?: Severity | 'ALL';
  onSelectSeverity?: (severity: Severity | 'ALL') => void;
}

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; barColor: string; textColor: string; bgColor: string }
> = {
  CRITICAL: {
    label: 'Critical (75–100)',
    barColor: 'bg-rose-500',
    textColor: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
  },
  HIGH: {
    label: 'High (50–74)',
    barColor: 'bg-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  MODERATE: {
    label: 'Moderate (25–49)',
    barColor: 'bg-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  LOW: {
    label: 'Low (0–24)',
    barColor: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
};

export function RiskDistributionChart({
  distribution,
  selectedSeverity = 'ALL',
  onSelectSeverity,
}: RiskDistributionChartProps) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Risk Distribution
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Zonal distribution across severity tiers (Mean Score: {distribution.averageScore}/100)
          </p>
        </div>
        {selectedSeverity !== 'ALL' && onSelectSeverity && (
          <button
            onClick={() => onSelectSeverity('ALL')}
            className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            Clear Tier Filter
          </button>
        )}
      </div>

      {/* Proportional Stacked Bar */}
      <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-white/[0.05] overflow-hidden flex">
        {distribution.buckets.map((b) => {
          const cfg = SEVERITY_CONFIG[b.severity];
          if (b.percentage === 0) return null;
          return (
            <div
              key={b.severity}
              style={{ width: `${b.percentage}%` }}
              className={cn(
                cfg.barColor,
                'h-full transition-all duration-300 relative group cursor-pointer',
              )}
              onClick={() => onSelectSeverity?.(b.severity)}
              title={`${cfg.label}: ${b.count} zones (${b.percentage}%)`}
            />
          );
        })}
      </div>

      {/* Breakdown Tiers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {distribution.buckets.map((b) => {
          const cfg = SEVERITY_CONFIG[b.severity];
          const isSelected = selectedSeverity === b.severity;

          return (
            <button
              key={b.severity}
              type="button"
              onClick={() => onSelectSeverity?.(isSelected ? 'ALL' : b.severity)}
              className={cn(
                'p-2.5 rounded-lg border text-left transition-all',
                cfg.bgColor,
                isSelected
                  ? 'ring-2 ring-cyan-500 shadow-sm'
                  : 'hover:border-slate-300 dark:hover:border-white/[0.15]',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('text-[10px] font-bold uppercase tracking-wider', cfg.textColor)}>
                  {b.severity}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {b.percentage}%
                </span>
              </div>
              <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                {b.count} <span className="text-[10px] font-normal text-slate-400">locations</span>
              </div>
              <div className="mt-1 text-[9px] text-slate-400 truncate">
                {b.locations.length > 0 ? b.locations.slice(0, 2).join(', ') : 'None'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
