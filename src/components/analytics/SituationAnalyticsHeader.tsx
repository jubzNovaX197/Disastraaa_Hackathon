'use client';

import { LiveStatusIndicator } from '@/components/realtime/LiveStatusIndicator';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import type { Role } from '@/types/roles';
import { Activity, Shield } from 'lucide-react';

interface SituationAnalyticsHeaderProps {
  role: Role;
  onRefresh?: () => void;
  lastUpdated?: string;
}

export function SituationAnalyticsHeader({
  role,
  onRefresh,
  lastUpdated = 'Live Intelligence Sync Active',
}: SituationAnalyticsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Situation Analytics
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Operational Feed
          </span>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Multi-hazard intelligence, impact trends and operational conditions
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <LiveStatusIndicator />

        <ThemeToggle size="sm" />

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
          <Shield className="w-3.5 h-3.5 text-cyan-500" />
          <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Clearance:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{role.replace('_', ' ')}</span>
        </div>
      </div>
    </div>
  );
}
