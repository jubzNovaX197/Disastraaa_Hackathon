'use client';

import { DataProvenance } from '@/components/demo/DataProvenance';
import { Badge, Card, CardTitle } from '@/components/ui';
import type { CitizenReportsIntelligence } from '@/lib/commandCenter/types';
import { cn } from '@/lib/utils';
import { Clock, Image as ImageIcon, MapPin, Users } from 'lucide-react';

interface CitizenReportsOperationsPanelProps {
  intelligence: CitizenReportsIntelligence;
}

export function CitizenReportsOperationsPanel({ intelligence }: CitizenReportsOperationsPanelProps) {
  const {
    totalReports,
    pendingReports,
    underReviewReports,
    verifiedReports,
    rejectedReports,
    escalatedReports,
    evidenceBackedReports,
    recentHighImpactReports,
  } = intelligence;

  return (
    <Card className="bg-surface-card/95 border-white/[0.08] shadow-lg">
      <DataProvenance />
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
            <Users className="w-4 h-4" />
          </span>
          <div>
            <CardTitle className="text-sm font-bold text-slate-100">
              Citizen Ground Intelligence (Tasks 10 & 11)
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Multimodal verification pipeline · Automated & community triage
            </p>
          </div>
        </div>
        <Badge severity={totalReports > 0 ? 'MODERATE' : 'LOW'} className="text-xs">
          {totalReports} Total Reports
        </Badge>
      </div>

      {/* Verification triage metrics grid */}
      <div className="p-3.5 border-b border-white/[0.06] bg-surface-elevated/40 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-white/5">
          <p className="text-slate-400 text-[10px]">Pending</p>
          <p className="text-sm font-bold text-slate-200">{pendingReports}</p>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-blue-300 text-[10px]">Under Review</p>
          <p className="text-sm font-bold text-blue-400">{underReviewReports}</p>
        </div>
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-green-300 text-[10px]">Verified</p>
          <p className="text-sm font-bold text-green-400">{verifiedReports}</p>
        </div>
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-300 text-[10px]">Rejected</p>
          <p className="text-sm font-bold text-red-400">{rejectedReports}</p>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-300 text-[10px]">Escalated</p>
          <p className="text-sm font-bold text-amber-400">{escalatedReports}</p>
        </div>
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-purple-300 text-[10px]">Evidence-Backed</p>
          <p className="text-sm font-bold text-purple-400">{evidenceBackedReports}</p>
        </div>
      </div>

      {/* Recent high-impact reports list */}
      <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
        {recentHighImpactReports.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No citizen ground reports have been submitted. Intake channels standing by.
          </div>
        ) : (
          recentHighImpactReports.map((report) => (
          <div key={report.id} className="p-3 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-200 truncate">{report.title}</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                  report.status === 'VERIFIED'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : report.status === 'COMMUNITY_CONFIRMED'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : report.status === 'UNDER_REVIEW'
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
                )}
              >
                {report.status.replace('_', ' ')}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 line-clamp-1">{report.description}</p>

            <div className="flex items-center justify-between text-[10px] text-slate-500 flex-wrap gap-2 pt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {report.address || report.administrativeArea}
              </span>

              {report.evidence && report.evidence.length > 0 ? (
                <span className="flex items-center gap-1 text-purple-400 font-medium">
                  <ImageIcon className="w-3 h-3" />
                  {report.evidence[0].type} ({report.preliminaryAnalysis?.evidenceAssessment?.score ?? 80}% conf.)
                </span>
              ) : (
                <span className="text-slate-500">Unverified eyewitness report</span>
              )}

              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-slate-500" />
                {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )))}
      </div>
    </Card>
  );
}
