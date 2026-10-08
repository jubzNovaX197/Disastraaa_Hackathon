'use client';

import {
  Flame,
  AlertTriangle,
  Users,
  Bell,
  CheckCircle2,
  NavigationOff,
  Home,
  PackageX,
} from 'lucide-react';
import type { AnalyticsOverviewKpis } from '@/lib/analytics/types';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AnalyticsOverviewKpiRowProps {
  kpis: AnalyticsOverviewKpis;
}

export function AnalyticsOverviewKpiRow({ kpis }: AnalyticsOverviewKpiRowProps) {
  const cards = [
    {
      label: 'Active Hazards',
      value: kpis.activeHazardsCount,
      sub: 'Cyclone, Flood, Surge',
      icon: Flame,
      color: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      status: 'Elevated Threat',
      statusColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'High-Risk Areas',
      value: kpis.highRiskAreasCount,
      sub: 'Critical / High zones',
      icon: AlertTriangle,
      color: 'text-rose-500 dark:text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      status: 'Active Impact',
      statusColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Population Exposed',
      value: formatNumber(kpis.populationExposed),
      sub: 'Across active sectors',
      icon: Users,
      color: 'text-cyan-500 dark:text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
      status: 'Demographic Risk',
      statusColor: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      label: 'Active Alerts',
      value: kpis.activeAlertsCount,
      sub: 'Red & Orange warnings',
      icon: Bell,
      color: 'text-purple-500 dark:text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      status: 'Mandatory Action',
      statusColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Verified Field Reports',
      value: kpis.verifiedFieldReportsCount,
      sub: 'Confirmed by ground teams',
      icon: CheckCircle2,
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      status: 'Ground Intel',
      statusColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Blocked Roads',
      value: kpis.blockedRoadsCount,
      sub: 'Severe transit disruptions',
      icon: NavigationOff,
      color: 'text-orange-500 dark:text-orange-400',
      bgColor: 'bg-orange-500/10 border-orange-500/20',
      status: 'Access Impaired',
      statusColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Shelter Pressure',
      value: kpis.sheltersUnderPressureCount,
      sub: 'Sites >85% capacity',
      icon: Home,
      color: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      status: 'Capacity Alert',
      statusColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Resource Shortages',
      value: kpis.resourceShortagesCount,
      sub: 'Categories with deficit',
      icon: PackageX,
      color: 'text-red-500 dark:text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/20',
      status: 'Logistics Gap',
      statusColor: 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="flex flex-col justify-between p-3 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm hover:border-slate-300 dark:hover:border-white/[0.15] transition-all"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {card.label}
              </span>
              <div
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center border flex-shrink-0',
                  card.bgColor,
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', card.color)} />
              </div>
            </div>

            <div className="mt-2">
              <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {card.value}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {card.sub}
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-white/[0.04]">
              <span className={cn('text-[10px] font-semibold tracking-wider uppercase', card.statusColor)}>
                {card.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
