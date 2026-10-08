'use client';
/* eslint-disable @next/next/no-img-element */

/**
 * ReportDetailPanel
 *
 * Detailed view of a citizen disaster report.
 * ⚠️  PROTOTYPE / DEMO DECISION SUPPORT
 *
 * Displays:
 * 1. Incident header, severity, and status badges
 * 2. Observed conditions description
 * 3. Blocked road metadata (if applicable)
 * 4. Evidence media attachments with local preview
 * 5. Preliminary Automated Analysis (transparent deterministic rule engine)
 * 6. Community Confirmations & Suspicious Flags
 * 7. Connected Ground Intelligence (nearby alerts, risk zones, shelters)
 * 8. Authority Verification Actions (Verify, Escalate, Reject with confirmation)
 */

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  FileText,
  Info,
  MapPin,
  Shield,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
  XCircle,
} from 'lucide-react';
import { cn, severityConfig, timeAgo } from '@/lib/utils';
import {
  BLOCKAGE_CONFIG,
  CONFIDENCE_CONFIG,
  REPORT_STATUS_CONFIG,
  REPORT_TYPE_CONFIG,
  updateCommunityFeedback,
  applyAuthorityVerification,
  type CitizenReportItem,
} from '@/lib/reports';
import { EvidencePreview } from './EvidencePreview';
import {
  assessPreliminaryEvidence,
  EVIDENCE_FLAG_CONFIG,
  QUALITY_CONFIG,
  CONSISTENCY_CONFIG,
  EVIDENCE_CONFIDENCE_CONFIG,
} from '@/lib/reports/evidence';

interface ReportDetailPanelProps {
  report: CitizenReportItem;
  onClose?: () => void;
  onUpdateReport?: (updated: CitizenReportItem) => void;
  /** When true, exposes authority verification actions */
  allowAuthorityActions?: boolean;
  className?: string;
}

export function ReportDetailPanel({
  report: initialReport,
  onClose,
  onUpdateReport,
  allowAuthorityActions = true,
  className,
}: ReportDetailPanelProps) {
  const [report, setReport] = useState<CitizenReportItem>(initialReport);
  const [authorityMode, setAuthorityMode] = useState(false);

  // Authority review state
  const [authorityAction, setAuthorityAction] = useState<'VERIFY' | 'ESCALATE' | 'REJECT' | null>(null);
  const [reviewerName, setReviewerName]       = useState('District Emergency Officer');
  const [authorityNotes, setAuthorityNotes]   = useState('');
  const [actionError, setActionError]         = useState<string | null>(null);

  // Sync state if initialReport changes (e.g. user selects different report on map)
  useEffect(() => {
    setReport(initialReport);
    setAuthorityAction(null);
    setActionError(null);
  }, [initialReport]);

  const statusCfg    = REPORT_STATUS_CONFIG[report.status] ?? REPORT_STATUS_CONFIG.PENDING;
  const severityCfg  = severityConfig[report.severity] ?? severityConfig.MODERATE;
  const typeCfg      = REPORT_TYPE_CONFIG[report.reportType] ?? REPORT_TYPE_CONFIG.OTHER;
  const prelimCfg    = CONFIDENCE_CONFIG[report.preliminaryAnalysis.confidence];

  // Deterministic preliminary evidence assessment
  const evidenceAssessment =
    report.preliminaryAnalysis.evidenceAssessment ??
    assessPreliminaryEvidence(report.evidence, {
      reportType: report.reportType,
      severity: report.severity,
      coordinates: report.coordinates,
      timestamp: report.createdAt,
      nearbyRiskZone: report.linkedIntelligence?.nearbyRiskZone,
      nearbyAlert: report.linkedIntelligence?.nearbyAlert,
    });

  const qualityCfg = QUALITY_CONFIG[evidenceAssessment.qualityIndicator];
  const consistencyCfg = CONSISTENCY_CONFIG[evidenceAssessment.contextConsistency];
  const evidenceConfCfg = EVIDENCE_CONFIDENCE_CONFIG[evidenceAssessment.confidence];

  // Community confirmation handler
  const handleFeedback = (action: 'CONFIRM' | 'SUSPICIOUS') => {
    const updated = updateCommunityFeedback(report, action);
    setReport(updated);
    onUpdateReport?.(updated);
  };

  // Authority verification handler
  const handleApplyAuthorityAction = () => {
    if (!authorityAction) return;
    setActionError(null);

    const result = applyAuthorityVerification(report, {
      action: authorityAction,
      reviewerName: reviewerName.trim() || 'Disaster Authority Officer',
      notes: authorityNotes.trim() || `Report marked ${authorityAction} following field verification.`,
      actionTaken:
        authorityAction === 'VERIFY'
          ? 'Field response team notified; added to verified situational awareness layer.'
          : authorityAction === 'ESCALATE'
          ? 'Emergency Operations Center dispatch alerted for immediate life-safety rescue.'
          : 'Report discarded as uncorroborated or duplicate.',
      isAuthority: true,
    });

    if (!result.success) {
      setActionError(result.error ?? 'Verification failed.');
      return;
    }

    setReport(result.report);
    onUpdateReport?.(result.report);
    setAuthorityAction(null);
  };

  return (
    <div
      className={cn(
        'w-full md:w-[420px] rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col font-sans transition-colors',
        className,
      )}
      role="region"
      aria-label={`Disaster Report: ${report.title}`}
    >
      {/* ── Header ── */}
      <div className={cn('p-4 border-b border-slate-200 dark:border-white/10 transition-colors', statusCfg.bg)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-sm">{typeCfg.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {typeCfg.label}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/10 font-mono text-slate-600 dark:text-slate-400">
                {report.id}
              </span>
              <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase', severityCfg.bg, severityCfg.color, severityCfg.border)}>
                {report.severity}
              </span>
            </div>
            <h2
              className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug"
              title={report.title}
            >
              {report.title}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
              aria-label="Close detail panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Strip */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 dark:border-white/10 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeAgo(report.createdAt)}</span>
            <span>·</span>
            <span>{report.reporter.name}</span>
          </div>

          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase flex items-center gap-1', statusCfg.bg, statusCfg.text, statusCfg.border)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
            <span>{statusCfg.label}</span>
          </span>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="px-4 py-3.5 space-y-4 max-h-[72vh] overflow-y-auto">

        {/* 1. Location Details */}
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 space-y-1">
          <div className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
            <MapPin className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{report.address}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{report.administrativeArea}</p>
            </div>
          </div>
          <div className="text-[10px] font-mono text-slate-400 pl-5">
            Coordinates: [{report.coordinates[0].toFixed(4)}, {report.coordinates[1].toFixed(4)}]
          </div>
        </div>

        {/* 2. Observed Description */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Observed Ground Conditions
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-100/60 dark:bg-white/5 p-3 rounded-lg border border-slate-200/50 dark:border-white/5">
            {report.description}
          </p>
        </div>

        {/* 3. Blocked Road Card (if present) */}
        {report.blockedRoadInfo && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span>🚧</span>
                <span>Blocked Road Intelligence</span>
              </span>
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase',
                report.blockedRoadInfo.severity === 'FULL'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
              )}>
                {report.blockedRoadInfo.severity === 'FULL' ? 'Completely Blocked' : 'Partially Passable'}
              </span>
            </div>
            <div className="text-xs text-slate-800 dark:text-slate-200">
              <span className="font-semibold">Route:</span> {report.blockedRoadInfo.roadName}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <span>Cause:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {BLOCKAGE_CONFIG[report.blockedRoadInfo.blockageType]?.icon}{' '}
                {BLOCKAGE_CONFIG[report.blockedRoadInfo.blockageType]?.label}
              </span>
            </div>
            {report.blockedRoadInfo.description && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1 border-t border-amber-500/20">
                &ldquo;{report.blockedRoadInfo.description}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* ── 4. Attached Ground Evidence ── */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-accent" />
              <span>Ground Observation Evidence</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {report.evidence.length} item(s) attached
            </span>
          </div>

          {report.evidence.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {report.evidence.map((ev) => (
                <EvidencePreview
                  key={ev.id}
                  evidence={ev}
                  size="sm"
                  allowFullscreen={true}
                  showMetadataBadge={true}
                />
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 text-center space-y-1">
              <div className="text-slate-400 text-xs flex items-center justify-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>No media attachments submitted</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Field assessment relies on reporter ground observations, crowd corroboration, and sensor proximity.
              </p>
            </div>
          )}
        </div>

        {/* ── 5. Preliminary Evidence Assessment ── */}
        <div className="rounded-lg bg-slate-50 dark:bg-surface-elevated/60 border border-slate-200 dark:border-white/10 p-3 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Preliminary Evidence Assessment
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  'text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase',
                  evidenceConfCfg?.bg ?? 'bg-slate-100',
                  evidenceConfCfg?.color ?? 'text-slate-700',
                  evidenceConfCfg?.border ?? 'border-slate-300',
                )}
              >
                {evidenceAssessment.confidence} CONFIDENCE
              </span>
            </div>
          </div>

          {/* Quality & Consistency Badges */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col gap-0.5">
              <div className="text-[9px] uppercase font-bold text-slate-400">Media Quality</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('text-[10px] font-bold px-1.5 py-0.2 rounded border', qualityCfg?.bg, qualityCfg?.color, qualityCfg?.border)}>
                  {qualityCfg?.label ?? evidenceAssessment.qualityIndicator}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 line-clamp-1">{qualityCfg?.description}</span>
            </div>

            <div className="p-2 rounded bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col gap-0.5">
              <div className="text-[9px] uppercase font-bold text-slate-400">Context Consistency</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('text-[10px] font-bold px-1.5 py-0.2 rounded border', consistencyCfg?.bg, consistencyCfg?.color, consistencyCfg?.border)}>
                  {consistencyCfg?.label ?? evidenceAssessment.contextConsistency}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 line-clamp-1">{consistencyCfg?.description}</span>
            </div>
          </div>

          {/* Completeness meter */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>Evidence Completeness</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {evidenceAssessment.completeness}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  evidenceAssessment.completeness >= 75
                    ? 'bg-emerald-500'
                    : evidenceAssessment.completeness >= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500',
                )}
                style={{ width: `${Math.max(5, evidenceAssessment.completeness)}%` }}
              />
            </div>
          </div>

          {/* Diagnostic Flags */}
          {evidenceAssessment.flags.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Diagnostic Context Flags:
              </div>
              <div className="flex flex-wrap gap-1">
                {evidenceAssessment.flags.map((flag) => {
                  const fCfg = EVIDENCE_FLAG_CONFIG[flag];
                  return (
                    <span
                      key={flag}
                      title={fCfg?.description}
                      className={cn(
                        'text-[9px] font-medium px-2 py-0.5 rounded border inline-flex items-center gap-1',
                        fCfg?.bg ?? 'bg-slate-100',
                        fCfg?.color ?? 'text-slate-700',
                        fCfg?.border ?? 'border-slate-200',
                      )}
                    >
                      <span>{fCfg?.icon ?? 'ℹ️'}</span>
                      <span>{fCfg?.label ?? flag}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transparent Engine Disclaimer */}
          <div className="text-[9px] text-slate-400 dark:text-slate-500 pt-1.5 border-t border-slate-200 dark:border-white/5 leading-relaxed flex items-start gap-1">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-400" />
            <span>
              <strong>Preliminary Evidence Assessment:</strong> Deterministic metadata & hazard context correlation only. Does NOT claim pixel-level AI vision verification.
            </span>
          </div>
        </div>

        {/* ── 6. Preliminary Automated Analysis (Deterministic Decision Support) ── */}
        <div className="rounded-lg bg-slate-50 dark:bg-surface-elevated/60 border border-slate-200 dark:border-white/10 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">⚡</span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Preliminary Automated Analysis
              </span>
            </div>
            <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase', prelimCfg.bg, prelimCfg.text, prelimCfg.border)}>
              {prelimCfg.icon} {prelimCfg.label}
            </span>
          </div>

          {/* Potential Alert Trigger Warning */}
          {report.preliminaryAnalysis.potentialAlertTrigger && (
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Potential Public Alert Trigger:</strong> High-severity emergency corroborating active threat indicators. Authority triage recommended immediately.
              </div>
            </div>
          )}

          {/* Scoring indicators */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-1.5 rounded bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
              <div className="text-[9px] text-slate-400 uppercase">Triage Score</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                {report.preliminaryAnalysis.score}/100
              </div>
            </div>
            <div className="p-1.5 rounded bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
              <div className="text-[9px] text-slate-400 uppercase">Urgency Rank</div>
              <div className={cn(
                'text-sm font-bold font-mono',
                report.preliminaryAnalysis.urgency === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500',
              )}>
                {report.preliminaryAnalysis.urgency}
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-1">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Corroboration Checklist:
            </div>
            <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              {report.preliminaryAnalysis.indicators.map((ind, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-accent mt-0.5">•</span>
                  <span>{ind}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-[9px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200 dark:border-white/5 leading-relaxed">
            * Deterministic decision-support model based on proximity, completeness, and hazard thresholds. Not official government verification.
          </div>
        </div>

        {/* 6. Community Confirmation Bar */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ThumbsUp className="w-3.5 h-3.5 text-accent" />
              <span>Community Ground Corroboration</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {report.communityConfirmations.confirmCount} confirmed · {report.communityConfirmations.suspiciousCount} suspicious
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleFeedback('CONFIRM')}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all',
                report.communityConfirmations.userFeedback === 'CONFIRMED'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs'
                  : 'border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300',
              )}
            >
              <span>👍 I observed this too</span>
              <span className="font-mono text-[10px]">({report.communityConfirmations.confirmCount})</span>
            </button>

            <button
              type="button"
              onClick={() => handleFeedback('SUSPICIOUS')}
              className={cn(
                'py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all',
                report.communityConfirmations.userFeedback === 'SUSPICIOUS'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40'
                  : 'border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500',
              )}
              title="Flag as suspicious, duplicate, or outdated"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>Flag Suspicious</span>
            </button>
          </div>

          <div className="text-[9px] text-slate-400 leading-relaxed">
            Community corroboration upgrades reports to <strong>COMMUNITY CONFIRMED</strong>. It assists authority triage but cannot officially verify an incident.
          </div>
        </div>

        {/* 7. Connected Ground Intelligence */}
        {Object.keys(report.linkedIntelligence).length > 0 && (
          <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20 space-y-2">
            <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
              <span>🌐</span>
              <span>Connected Intelligence Feeds</span>
            </div>

            <div className="space-y-1.5 text-xs">
              {report.linkedIntelligence.nearbyAlert && (
                <div className="p-2 rounded bg-white dark:bg-white/5 border border-sky-500/10">
                  <div className="text-[9px] text-sky-600 dark:text-sky-400 uppercase font-semibold">
                    Related Active Warning
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {report.linkedIntelligence.nearbyAlert.title}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Distance: {report.linkedIntelligence.nearbyAlert.distanceKm} km · Severity: {report.linkedIntelligence.nearbyAlert.severity}
                  </div>
                </div>
              )}

              {report.linkedIntelligence.nearbyRiskZone && (
                <div className="p-2 rounded bg-white dark:bg-white/5 border border-sky-500/10">
                  <div className="text-[9px] text-sky-600 dark:text-sky-400 uppercase font-semibold">
                    Designated Risk Zone
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {report.linkedIntelligence.nearbyRiskZone.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Risk Score: {report.linkedIntelligence.nearbyRiskZone.score}/100 · Distance: {report.linkedIntelligence.nearbyRiskZone.distanceKm} km
                  </div>
                </div>
              )}

              {report.linkedIntelligence.nearbyShelter && (
                <div className="p-2 rounded bg-white dark:bg-white/5 border border-sky-500/10">
                  <div className="text-[9px] text-sky-600 dark:text-sky-400 uppercase font-semibold">
                    Nearest Evacuation Shelter
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {report.linkedIntelligence.nearbyShelter.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Capacity: {report.linkedIntelligence.nearbyShelter.occupancy}/{report.linkedIntelligence.nearbyShelter.capacity} ({report.linkedIntelligence.nearbyShelter.status})
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 8. Authority Verification State & Workflow Actions */}
        <div className="p-3.5 rounded-lg bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Authority Verification Status
              </span>
            </div>

            {allowAuthorityActions && (
              <button
                type="button"
                onClick={() => setAuthorityMode((v) => !v)}
                className="text-[10px] font-semibold text-accent hover:underline flex items-center gap-1"
              >
                {authorityMode ? 'Exit Review Mode' : 'Authority Triage Mode'}
              </button>
            )}
          </div>

          {/* Official Verification Log */}
          {report.authorityVerification.reviewedAt ? (
            <div className="p-2.5 rounded bg-white dark:bg-surface-base border border-slate-200 dark:border-white/10 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {report.authorityVerification.reviewedBy}
                </span>
                <span className={cn('text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase', statusCfg.bg, statusCfg.text, statusCfg.border)}>
                  {report.authorityVerification.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {report.authorityVerification.notes}
              </p>
              {report.authorityVerification.actionTaken && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Action: {report.authorityVerification.actionTaken}
                </p>
              )}
              <div className="text-[9px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-white/5">
                Timestamp: {new Date(report.authorityVerification.reviewedAt).toLocaleString('en-IN')}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              Awaiting official review by State or District Disaster Management Authority.
            </p>
          )}

          {/* Authority Actions Bar (When in Authority Mode) */}
          {allowAuthorityActions && authorityMode && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2.5">
              {/* Future Computer Vision Pipeline Readiness */}
              {evidenceAssessment.futureCvCompatibility && (
                <div className="p-2.5 rounded-lg bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 text-[11px]">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Future Computer Vision Pipeline</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-semibold">
                      {evidenceAssessment.futureCvCompatibility.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">Target Detection:</span>{' '}
                    <span className="font-mono text-indigo-600 dark:text-indigo-300">
                      {evidenceAssessment.futureCvCompatibility.pipelineTarget}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                    {evidenceAssessment.futureCvCompatibility.notes}
                  </p>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 pt-1 border-t border-indigo-500/15">
                    * AI computer vision models (e.g. flood inundation depth, debris classification) can plug into this pipeline without modifying report schemas.
                  </div>
                </div>
              )}

              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Execute Verification Action:
              </div>

              <div className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                * Preliminary evidence assessment provides decision-support only. Official verification requires field authority review.
              </div>

              {actionError && (
                <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAuthorityAction('VERIFY')}
                  className={cn(
                    'py-2 px-1 text-xs font-bold rounded border transition-colors flex flex-col items-center gap-1',
                    authorityAction === 'VERIFY'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-600'
                      : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10',
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>VERIFY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthorityAction('ESCALATE')}
                  className={cn(
                    'py-2 px-1 text-xs font-bold rounded border transition-colors flex flex-col items-center gap-1',
                    authorityAction === 'ESCALATE'
                      ? 'bg-rose-500 text-white border-rose-600'
                      : 'border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10',
                  )}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ESCALATE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthorityAction('REJECT')}
                  className={cn(
                    'py-2 px-1 text-xs font-bold rounded border transition-colors flex flex-col items-center gap-1',
                    authorityAction === 'REJECT'
                      ? 'bg-slate-700 text-white border-slate-800'
                      : 'border-slate-400/40 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10',
                  )}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>REJECT</span>
                </button>
              </div>

              {/* Action confirmation dialog */}
              {authorityAction && (
                <div className="p-3 rounded-lg bg-white dark:bg-surface-card border border-slate-300 dark:border-white/15 space-y-2 shadow-lg animate-fade-in">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Confirm Transition to {authorityAction}
                  </div>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Reviewer Name / Agency"
                    className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100"
                  />
                  <textarea
                    rows={2}
                    value={authorityNotes}
                    onChange={(e) => setAuthorityNotes(e.target.value)}
                    placeholder="Official verification remarks or operational instructions..."
                    className="w-full text-xs p-2 rounded bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 resize-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthorityAction(null)}
                      className="px-3 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAuthorityAction}
                      className="px-4 py-1 rounded text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90 shadow-sm"
                    >
                      Confirm Action
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
