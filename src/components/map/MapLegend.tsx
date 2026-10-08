'use client';

/**
 * MapLegend — compact severity legend shown on the map.
 * Works in both dark and light themes.
 */

import { cn } from '@/lib/utils';

const SEVERITY_ITEMS = [
  { label: 'Critical', color: '#EF4444' },
  { label: 'High',     color: '#F97316' },
  { label: 'Moderate', color: '#F59E0B' },
  { label: 'Low',      color: '#10B981' },
] as const;

interface MapLegendProps {
  className?: string;
}

export function MapLegend({ className }: MapLegendProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto rounded-lg px-3 py-2',
        'bg-white/95 dark:bg-surface-elevated/95 backdrop-blur-md',
        'border border-slate-200/80 dark:border-white/10',
        'shadow-lg map-panel',
        className,
      )}
    >
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        Severity
      </p>
      <div className="flex flex-col gap-1">
        {SEVERITY_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
