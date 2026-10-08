/**
 * HistoricalDashboardStats
 * Server component — top-level stat cards for the historical analysis page.
 */

import type { HistoricalSummary } from '@/lib/historical/types';
import { formatNumber } from '@/lib/utils';

interface Props {
  summary: HistoricalSummary;
}

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'text-safe',
  MODERATE: 'text-warning',
  HIGH:     'text-orange-400',
  CRITICAL: 'text-critical',
};

export function HistoricalDashboardStats({ summary }: Props) {
  const criticalOrHigh =
    (summary.bySeverity['CRITICAL'] ?? 0) + (summary.bySeverity['HIGH'] ?? 0);

  const cards = [
    {
      label: 'Events Recorded',
      value: summary.totalEvents,
      sub: `${summary.yearRange[0]}–${summary.yearRange[1]}`,
      color: 'text-accent',
      iconBg: 'bg-accent/10',
      icon: '🕐',
    },
    {
      label: 'Max Pop. Affected',
      value: formatNumber(summary.maxAffectedPopulation),
      sub: 'Single event peak',
      color: 'text-critical',
      iconBg: 'bg-critical/10',
      icon: '👥',
    },
    {
      label: 'HIGH+ Severity',
      value: criticalOrHigh,
      sub: `of ${summary.totalEvents} total`,
      color: 'text-orange-400',
      iconBg: 'bg-orange-400/10',
      icon: '⚡',
    },
    {
      label: 'Dominant Hazard',
      value: summary.dominantHazardType.toLowerCase().replace('_', ' '),
      sub: `${summary.byType[summary.dominantHazardType] ?? 0} events`,
      color: 'text-warning',
      iconBg: 'bg-warning/10',
      icon: '🌊',
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl bg-surface-card border border-white/[0.07] p-4"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 mb-1 truncate">{c.label}</p>
              <p className={`text-xl font-bold capitalize ${c.color} truncate`}>
                {typeof c.value === 'number' ? c.value.toLocaleString('en-IN') : c.value}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5 truncate">{c.sub}</p>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
              <span className="text-sm">{c.icon}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
