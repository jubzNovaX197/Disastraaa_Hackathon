'use client';

import { cn } from '@/lib/utils';
import { Activity, Bell, CheckCircle2, TrendingUp, UserX } from 'lucide-react';

interface KPICardProps {
  label:    string;
  value:    number;
  icon:     React.ReactNode;
  color:    string;
  bg:       string;
  border:   string;
  pulse?:   boolean;
}

function KPICard({ label, value, icon, color, bg, border, pulse }: KPICardProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border flex-1 min-w-0',
      'bg-white dark:bg-surface-card',
      border,
    )}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
        <span className={cn('w-4 h-4', color)}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div className={cn('text-xl font-bold font-mono leading-none', color, pulse && 'animate-pulse')}>
          {value}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{label}</div>
      </div>
    </div>
  );
}

interface IncidentKPIRowProps {
  kpis: {
    active: number;
    critical: number;
    unassigned: number;
    inProgress: number;
    escalated: number;
    resolvedToday: number;
  };
}

export function IncidentKPIRow({ kpis }: IncidentKPIRowProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
      <KPICard
        label="Active Incidents"
        value={kpis.active}
        icon={<Activity className="w-4 h-4" />}
        color="text-sky-600 dark:text-sky-400"
        bg="bg-sky-100 dark:bg-sky-500/15"
        border="border-sky-200 dark:border-sky-500/25"
      />
      <KPICard
        label="Critical"
        value={kpis.critical}
        icon={<Bell className="w-4 h-4" />}
        color="text-rose-600 dark:text-rose-400"
        bg="bg-rose-100 dark:bg-rose-500/15"
        border="border-rose-200 dark:border-rose-500/25"
        pulse={kpis.critical > 0}
      />
      <KPICard
        label="Awaiting Assignment"
        value={kpis.unassigned}
        icon={<UserX className="w-4 h-4" />}
        color="text-amber-600 dark:text-amber-400"
        bg="bg-amber-100 dark:bg-amber-500/15"
        border="border-amber-200 dark:border-amber-500/25"
      />
      <KPICard
        label="In Progress"
        value={kpis.inProgress}
        icon={<Activity className="w-4 h-4" />}
        color="text-violet-600 dark:text-violet-400"
        bg="bg-violet-100 dark:bg-violet-500/15"
        border="border-violet-200 dark:border-violet-500/25"
      />
      <KPICard
        label="Escalated"
        value={kpis.escalated}
        icon={<TrendingUp className="w-4 h-4" />}
        color="text-orange-600 dark:text-orange-400"
        bg="bg-orange-100 dark:bg-orange-500/15"
        border="border-orange-200 dark:border-orange-500/25"
        pulse={kpis.escalated > 0}
      />
      <KPICard
        label="Resolved Today"
        value={kpis.resolvedToday}
        icon={<CheckCircle2 className="w-4 h-4" />}
        color="text-emerald-600 dark:text-emerald-400"
        bg="bg-emerald-100 dark:bg-emerald-500/15"
        border="border-emerald-200 dark:border-emerald-500/25"
      />
    </div>
  );
}
