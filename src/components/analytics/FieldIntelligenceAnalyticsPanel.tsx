'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import type { FieldIntelligenceAnalyticsData } from '@/lib/analytics/types';
import { cn } from '@/lib/utils';
import {
  AlertOctagon,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';

interface FieldIntelligenceAnalyticsPanelProps {
  fieldData: FieldIntelligenceAnalyticsData;
}

export function FieldIntelligenceAnalyticsPanel({
  fieldData,
}: FieldIntelligenceAnalyticsPanelProps) {
  const statusItems = [
    {
      label: 'Verified',
      count: fieldData.verifiedReports,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    {
      label: 'Evidence-Backed',
      count: fieldData.evidenceBackedReports,
      icon: Camera,
      color: 'text-cyan-500',
      badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    },
    {
      label: 'Under Review',
      count: fieldData.underReviewReports,
      icon: Search,
      color: 'text-blue-500',
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    {
      label: 'Pending Triage',
      count: fieldData.pendingReports,
      icon: Clock,
      color: 'text-amber-500',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    {
      label: 'Escalated',
      count: fieldData.escalatedReports,
      icon: AlertOctagon,
      color: 'text-purple-500',
      badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    },
    {
      label: 'Rejected',
      count: fieldData.rejectedReports,
      icon: XCircle,
      color: 'text-slate-400',
      badge: 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 border-slate-200 dark:border-white/[0.08]',
    },
  ];

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/[0.07] shadow-sm space-y-4">
      <DataProvenance model />
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Field Intelligence
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">
            Total Intake: <strong className="text-slate-900 dark:text-white">{fieldData.totalReports}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {fieldData.verificationRatePct}% Authenticated
          </span>
        </div>
      </div>

      {/* Verification Pipeline */}
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Verification Pipeline
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-1.5">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={cn('p-2.5 rounded-lg border text-center', item.badge)}
              >
                <Icon className={cn('w-4 h-4 mx-auto mb-1', item.color)} />
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {item.count}
                </div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident Categories with Verified progress */}
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Reports by Operational Category
        </span>
        <div className="space-y-2 mt-2">
          {fieldData.byCategory.map((cat) => {
            const pct =
              cat.count > 0 ? Math.round((cat.verifiedCount / cat.count) * 100) : 0;
            return (
              <div
                key={cat.category}
                className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {cat.label}
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400">
                      Total: <strong>{cat.count}</strong>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Verified: <strong>{cat.verifiedCount}</strong> ({pct}%)
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] overflow-hidden flex">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full bg-emerald-500 transition-all duration-300"
                    title={`Verified: ${cat.verifiedCount} of ${cat.count}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          {fieldData.verificationDisclaimer}
        </p>
      </div>
    </div>
  );
}
