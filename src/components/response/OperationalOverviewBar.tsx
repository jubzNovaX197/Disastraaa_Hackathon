'use client';

import {
  Flame,
  ShieldAlert,
  PackageX,
  Home,
  AlertTriangle,
  FileClock,
} from 'lucide-react';
import { Card } from '@/components/ui';
import type { OperationalOverviewMetrics } from '@/lib/response/types';
import { cn } from '@/lib/utils';

interface OperationalOverviewBarProps {
  metrics: OperationalOverviewMetrics;
}

export function OperationalOverviewBar({ metrics }: OperationalOverviewBarProps) {
  const cards = [
    {
      label: 'Active Incidents',
      value: metrics.activeIncidents,
      sub: 'Cyclone & Flood Corridors',
      icon: Flame,
      color: 'text-critical',
      bg: 'bg-red-500/10 border-red-500/20',
      iconBg: 'bg-red-500/20 text-critical',
    },
    {
      label: 'High Priority Areas',
      value: metrics.highPriorityAreas,
      sub: 'Priority Index >= 55',
      icon: ShieldAlert,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
      iconBg: 'bg-orange-500/20 text-orange-400',
    },
    {
      label: 'Resource Shortages',
      value: metrics.resourceShortages,
      sub: 'Deficit Supply Categories',
      icon: PackageX,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-400',
    },
    {
      label: 'Shelter Pressure',
      value: metrics.shelterPressure,
      sub: 'High-Demand Units',
      icon: Home,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      iconBg: 'bg-purple-500/20 text-purple-400',
    },
    {
      label: 'Road Blockages',
      value: metrics.roadBlockages,
      sub: 'Impassable / Closed Segments',
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      iconBg: 'bg-red-500/20 text-red-400',
    },
    {
      label: 'Pending Field Reports',
      value: metrics.pendingFieldReports,
      sub: 'Awaiting Triage Review',
      icon: FileClock,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className={cn('p-3 border shadow-sm', c.bg)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {c.label}
                </p>
                <p className={cn('text-2xl font-black mt-1 font-mono', c.color)}>{c.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{c.sub}</p>
              </div>
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', c.iconBg)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
