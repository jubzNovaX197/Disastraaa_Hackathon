/**
 * DashboardAlertList — renders the active alerts list on the dashboard.
 * Server component (no 'use client' needed).
 */

import { Badge } from '@/components/ui';
import type { DemoAlert } from '@/data/types';
import { timeAgo } from '@/lib/utils';

const HAZARD_ICON: Record<string, string> = {
  FLOOD:       '🌊',
  CYCLONE:     '🌀',
  HEATWAVE:    '🌡️',
  LIGHTNING:   '⚡',
  LANDSLIDE:   '⛰️',
  DROUGHT:     '🏜️',
  STORM_SURGE: '🌊',
};

export function DashboardAlertList({ alerts }: { alerts: DemoAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-slate-600">
        No active alerts
      </div>
    );
  }

  const sorted = [...alerts].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });

  return (
    <ul className="divide-y divide-white/[0.04]">
      {sorted.map((alert) => (
        <li key={alert.id} className="px-4 py-3 flex items-start gap-3">
          <span className="text-base leading-none mt-0.5 flex-shrink-0">
            {HAZARD_ICON[alert.type] ?? '⚠️'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge severity={alert.severity} dot className="text-[10px]">
                {alert.severity}
              </Badge>
              <span className="text-xs font-medium text-slate-200 truncate">
                {alert.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-2">{alert.message}</p>
            <p className="text-[10px] text-slate-600 mt-1">
              {alert.regionName} · {timeAgo(alert.issuedAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
