'use client';

/**
 * PublicReportList
 *
 * Public citizen ground intelligence explorer.
 * ⚠️  PROTOTYPE / DEMO DECISION SUPPORT
 *
 * Features:
 * - Dynamic category filters (All, Flood, Cyclone, Roads, Infrastructure, Medical, Shelter, Verified, Under Review, Escalated)
 * - Sorting: Newest, Severity, Most Confirmed
 * - Search keyword query
 * - Real-time statistics summary strip
 * - "Report Disaster Incident" CTA launching modal
 * - Interactive report detail panel viewer
 */

import { useLiveIntelligence } from '@/context/LiveIntelligenceContext';
import {
  filterAndSortReports,
  REPORT_STATUS_CONFIG,
  REPORT_TYPE_CONFIG,
  type CitizenReportItem,
  type CreateReportInput
} from '@/lib/reports';
import { cn, severityConfig, timeAgo } from '@/lib/utils';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  ThumbsUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CitizenReportForm } from './CitizenReportForm';
import { ReportDetailPanel } from './ReportDetailPanel';

type FilterCategory =
  | 'ALL'
  | 'FLOOD'
  | 'CYCLONE'
  | 'ROADS'
  | 'INFRASTRUCTURE'
  | 'MEDICAL'
  | 'SHELTER'
  | 'VERIFIED'
  | 'UNDER_REVIEW'
  | 'ESCALATED';

type SortOption = 'NEWEST' | 'SEVERITY' | 'CONFIRMATIONS';

export function PublicReportList() {
  const router = useRouter();
  const { overrides, submitCitizenReport, environment } = useLiveIntelligence();
  const [localReports, setLocalReports] = useState<CitizenReportItem[] | null>(null);
  const reports = localReports ?? overrides.reports;

  const [selectedReport, setSelectedReport]   = useState<CitizenReportItem | null>(null);
  const [isFormOpen, setIsFormOpen]           = useState(false);
  const [filterCategory, setFilterCategory]   = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery]         = useState('');
  const [sortBy, setSortBy]                   = useState<SortOption>('NEWEST');

  // Compute live stats
  const stats = useMemo(() => {
    const total = reports.length;
    const verified = reports.filter((r) => r.status === 'VERIFIED').length;
    const underReview = reports.filter((r) => r.status === 'UNDER_REVIEW' || r.status === 'PENDING').length;
    const confirmed = reports.filter((r) => r.status === 'COMMUNITY_CONFIRMED').length;
    const escalated = reports.filter((r) => r.status === 'ESCALATED').length;
    return { total, verified, underReview, confirmed, escalated };
  }, [reports]);

  // Filtered and sorted reports
  const displayReports = useMemo(() => {
    return filterAndSortReports(reports, {
      category: filterCategory,
      searchQuery,
      sortBy,
    });
  }, [reports, filterCategory, searchQuery, sortBy]);

  // Handle new report submission
  const handleCreateReport = async (input: CreateReportInput) => {
    const res = await submitCitizenReport(input);
    setSelectedReport(res.report);
    return res;
  };

  // Handle report update (from detail panel votes or authority actions)
  const handleUpdateReport = (updated: CitizenReportItem) => {
    setLocalReports((prev) => {
      const base = prev ?? overrides.reports;
      return base.map((r) => (r.id === updated.id ? updated : r));
    });
    if (selectedReport?.id === updated.id) {
      setSelectedReport(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Submission Modal — z-[60] with safe top clearance to prevent header cutoff ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm overflow-y-auto flex justify-center p-3 sm:p-4 md:p-6 pt-20 sm:pt-20 pb-8 sm:pb-12 animate-fade-in">
          <div className="w-full max-w-2xl my-auto">
            <CitizenReportForm
              onSubmitReport={handleCreateReport}
              onViewOnMap={() => {
                setIsFormOpen(false);
                router.push('/map');
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Detail Panel Modal (Mobile / Tablet) / Floating ── */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 lg:hidden animate-fade-in">
          <div className="w-full max-w-md max-h-[90vh]">
            <ReportDetailPanel
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
              onUpdateReport={handleUpdateReport}
            />
          </div>
        </div>
      )}

      {/* ── Top Summary Header & Stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Ground Intelligence & Citizen Reports</span>
            <span
              className={cn(
                'text-[10px] font-mono px-2 py-0.5 rounded font-semibold tracking-wider uppercase',
                environment === 'REAL'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
              )}
            >
              {environment === 'REAL' ? 'LIVE OPERATIONAL' : 'SIMULATION / DEMO'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            {environment === 'REAL'
              ? 'Community-driven disaster observations. Real citizen submissions undergo automated validation, community corroboration, and official authority verification.'
              : 'Community-driven disaster observations across Odisha & Andhra Pradesh. Reports undergo deterministic triage, community corroboration, and official authority verification.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90 transition-all shadow-md shadow-accent/10 active:scale-98 self-start sm:self-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Report Disaster Incident</span>
        </button>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-xs">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Reports</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
            {stats.total}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {environment === 'REAL' ? 'Active database records' : 'Simulated field feed'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-xs">
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Authority Verified</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
            {stats.verified}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Official action active</div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-xs">
          <div className="text-[10px] text-amber-500 uppercase font-semibold flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />
            <span>Community Confirmed</span>
          </div>
          <div className="text-2xl font-bold text-amber-500 font-mono mt-0.5">
            {stats.confirmed}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Corroborated by citizens</div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-xs">
          <div className="text-[10px] text-sky-500 uppercase font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Under Review</span>
          </div>
          <div className="text-2xl font-bold text-sky-500 font-mono mt-0.5">
            {stats.underReview}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Automated preliminary triage</div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[10px] text-rose-500 uppercase font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Escalated / High Priority</span>
          </div>
          <div className="text-2xl font-bold text-rose-500 font-mono mt-0.5">
            {stats.escalated}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Urgent intervention needed</div>
        </div>
      </div>

      {/* ── Filters & Search Controls ── */}
      <div className="p-3 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-xs space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
          {[
            { id: 'ALL',            label: 'All Reports' },
            { id: 'FLOOD',          label: '🌊 Flooding' },
            { id: 'CYCLONE',        label: '🌀 Cyclone' },
            { id: 'ROADS',          label: '🚧 Roads & Passes' },
            { id: 'INFRASTRUCTURE', label: '🏚️ Infrastructure' },
            { id: 'MEDICAL',        label: '🚑 Medical Urgent' },
            { id: 'SHELTER',        label: '⛺ Shelter Needs' },
            { id: 'VERIFIED',       label: '✓ Verified Only' },
            { id: 'UNDER_REVIEW',   label: '🔍 Under Review' },
            { id: 'ESCALATED',      label: '🚨 Escalated' },
          ].map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setFilterCategory(cat.id as FilterCategory)}
              className={cn(
                'px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border text-xs',
                filterCategory === cat.id
                  ? 'bg-accent/15 border-accent text-cyan-800 dark:text-accent font-bold'
                  : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search bar & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between pt-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by title, location, route..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-surface-base border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-accent text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-surface-base border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="NEWEST">🕒 Newest First</option>
              <option value="SEVERITY">⚠️ Highest Severity</option>
              <option value="CONFIRMATIONS">👥 Most Confirmed</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Report Grid / List + Desktop Side Detail Panel ── */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Reports List */}
        <div className={cn(selectedReport ? 'lg:col-span-7' : 'lg:col-span-12', 'space-y-3 transition-all')}>
          {displayReports.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 text-slate-400 space-y-2">
              <Filter className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              {reports.length === 0 ? (
                <>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {environment === 'REAL'
                      ? 'No citizen reports have been received'
                      : 'No simulation reports available in this scenario'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {environment === 'REAL'
                      ? 'No operational field telemetry has been submitted yet. Citizen reports submitted through the public portal will appear here in real time.'
                      : 'Load or trigger a disaster scenario to view simulated citizen reports.'}
                  </p>
                  {environment === 'REAL' && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 inline-flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Database: Connected</span>
                      <span>•</span>
                      <span>Status: Listening for reports</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No citizen reports match this filter.
                  </p>
                  <p className="text-xs text-slate-500">
                    Try selecting &quot;All Reports&quot; or clearing search terms.
                  </p>
                </>
              )}
            </div>
          ) : (
            displayReports.map((r) => {
              const statusCfg = REPORT_STATUS_CONFIG[r.status] ?? REPORT_STATUS_CONFIG.PENDING;
              const severityCfg = severityConfig[r.severity] ?? severityConfig.MODERATE;
              const typeCfg = REPORT_TYPE_CONFIG[r.reportType] ?? REPORT_TYPE_CONFIG.OTHER;
              const isSelected = selectedReport?.id === r.id;

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={cn(
                    'p-4 rounded-xl bg-white dark:bg-surface-card border transition-all cursor-pointer hover:shadow-md group',
                    isSelected
                      ? 'border-accent ring-1 ring-accent bg-accent/[0.02]'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base">{typeCfg.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {typeCfg.label}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 font-mono text-slate-500">
                          {r.id}
                        </span>
                        <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase', severityCfg.bg, severityCfg.color, severityCfg.border)}>
                          {r.severity}
                        </span>

                        {r.preliminaryAnalysis.potentialAlertTrigger && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 uppercase flex items-center gap-1">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            <span>Alert Trigger</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-800 dark:group-hover:text-accent transition-colors leading-snug">
                        {r.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {r.description}
                      </p>

                      {/* Blocked Road tag */}
                      {r.blockedRoadInfo && (
                        <div className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                          <span>🚧</span>
                          <span>{r.blockedRoadInfo.roadName} ({r.blockedRoadInfo.severity === 'FULL' ? 'Impassable' : 'Partial'})</span>
                        </div>
                      )}

                      {/* Metadata footer */}
                      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-accent" />
                          <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px]">
                            {r.address}
                          </span>
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{timeAgo(r.createdAt)}</span>
                        </span>

                        <span className="flex items-center gap-1 font-mono">
                          <ThumbsUp className="w-3 h-3 text-slate-400" />
                          <span>{r.confirmCount} confirms</span>
                        </span>

                        {r.evidence.length > 0 ? (
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <Camera className="w-3 h-3 text-accent" />
                            <span>{r.evidence.length} evidence</span>
                            {r.preliminaryAnalysis.evidenceAssessment && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200/80 dark:bg-white/10 font-mono text-slate-500 dark:text-slate-400">
                                {r.preliminaryAnalysis.evidenceAssessment.confidence}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 text-[10px]">
                            <span>📷 No media</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status pill right side */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase flex items-center gap-1', statusCfg.bg, statusCfg.text, statusCfg.border)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                        <span>{statusCfg.label}</span>
                      </span>

                      <div className="text-[10px] font-mono text-slate-400">
                        Score: {r.preliminaryAnalysis.score}/100
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Desktop Detail Panel */}
        {selectedReport && (
          <div className="hidden lg:block lg:col-span-5 sticky top-20">
            <ReportDetailPanel
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
              onUpdateReport={handleUpdateReport}
            />
          </div>
        )}
      </div>
    </div>
  );
}
