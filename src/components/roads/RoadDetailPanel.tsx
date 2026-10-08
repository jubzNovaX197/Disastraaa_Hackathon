'use client';

/**
 * RoadDetailPanel
 *
 * Detailed view and authority management panel for road network segments.
 * ⚠️  PROTOTYPE / DEMO DECISION SUPPORT
 *
 * Displays:
 * 1. Road header, route code, classification, and administrative area
 * 2. Public Travel Safety Guidance ("Can I use this road?")
 * 3. Operational status and blockage details
 * 4. Travel Risk & Safety score (0–100) with contributing hazard factors
 * 5. Connected Citizen Ground Reports & Evidence
 * 6. Critical Destinations (connected shelters and medical facilities)
 * 7. Authority Verification Status & Workflow Actions (Verify, Mark Open, Partial, Closed, Escalate)
 */

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Hospital,
  Info,
  MapPin,
  Navigation,
  Shield,
  ShieldAlert,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { cn, severityConfig, timeAgo } from '@/lib/utils';
import {
  ROAD_STATUS_CONFIG,
  ROAD_BLOCKAGE_CONFIG,
  ROAD_TYPE_CONFIG,
  applyAuthorityRoadAction,
  type RoadSegment,
} from '@/lib/roads';
import type { CitizenReportItem } from '@/lib/reports/types';

interface RoadDetailPanelProps {
  road: RoadSegment;
  onClose?: () => void;
  onUpdateRoad?: (updated: RoadSegment) => void;
  allowAuthorityActions?: boolean;
  relatedCitizenReports?: CitizenReportItem[];
  onSelectReport?: (report: CitizenReportItem) => void;
  className?: string;
}

export function RoadDetailPanel({
  road: initialRoad,
  onClose,
  onUpdateRoad,
  allowAuthorityActions = true,
  relatedCitizenReports = [],
  onSelectReport,
  className,
}: RoadDetailPanelProps) {
  const [road, setRoad] = useState<RoadSegment>(initialRoad);
  const [authorityMode, setAuthorityMode] = useState(false);

  // Authority action modal state
  const [pendingAction, setPendingAction] = useState<
    'VERIFY_BLOCKAGE' | 'MARK_OPEN' | 'MARK_PARTIALLY_BLOCKED' | 'MARK_CLOSED' | 'ESCALATE' | null
  >(null);
  const [reviewerName, setReviewerName]   = useState('National Highway & PWD Control Officer');
  const [authorityNotes, setAuthorityNotes] = useState('');

  // Sync state if initialRoad prop changes
  useEffect(() => {
    setRoad(initialRoad);
    setPendingAction(null);
  }, [initialRoad]);

  const statusCfg   = ROAD_STATUS_CONFIG[road.status] ?? ROAD_STATUS_CONFIG.UNKNOWN;
  const blockageCfg = ROAD_BLOCKAGE_CONFIG[road.blockageType] ?? ROAD_BLOCKAGE_CONFIG.UNKNOWN;
  const typeCfg     = ROAD_TYPE_CONFIG[road.roadType] ?? ROAD_TYPE_CONFIG.MAJOR_ROAD;
  const riskSevCfg  = severityConfig[road.travelRisk.severity] ?? severityConfig.MODERATE;

  // Filter citizen reports that match this road's related report IDs
  const matchingReports = relatedCitizenReports.filter((cr) =>
    road.relatedReportIds.includes(cr.id),
  );

  // Handle authority verification action
  const handleApplyAction = () => {
    if (!pendingAction) return;

    const updated = applyAuthorityRoadAction(road, pendingAction, {
      name: reviewerName.trim() || 'Disaster Management Authority Officer',
      notes: authorityNotes.trim() || `Operational status updated via Authority Road Triage.`,
    });

    setRoad(updated);
    onUpdateRoad?.(updated);
    setPendingAction(null);
    setAuthorityNotes('');
  };

  return (
    <div
      className={cn(
        'w-full md:w-[430px] rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col font-sans transition-colors',
        className,
      )}
      role="region"
      aria-label={`Road Travel Safety: ${road.name}`}
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
              {road.code && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/10 font-bold text-slate-700 dark:text-slate-300">
                  {road.code}
                </span>
              )}
              {road.lengthKm && (
                <span className="text-[9px] text-slate-500 dark:text-slate-400">
                  · {road.lengthKm} km segment
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug truncate" title={road.name}>
              {road.name}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-accent flex-shrink-0" />
              <span>{road.administrativeArea}</span>
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
              aria-label="Close road detail panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status indicator strip */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 dark:border-white/10 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {timeAgo(road.lastUpdated)}</span>
            <span>·</span>
            <span className="capitalize">{road.source.replace('_', ' ').toLowerCase()}</span>
          </div>

          <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase flex items-center gap-1.5 shadow-2xs', statusCfg.badge)}>
            <span className={cn('w-2 h-2 rounded-full animate-pulse', statusCfg.dot)} />
            <span>{statusCfg.label}</span>
          </span>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="px-4 py-3.5 space-y-4 max-h-[72vh] overflow-y-auto">

        {/* ── 1. Public View: "Can I use this road?" Banner ── */}
        <div className={cn('p-3 rounded-lg border flex flex-col gap-1.5', statusCfg.bg, statusCfg.border)}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-accent" />
              <span>Public Travel Intelligence</span>
            </span>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded', road.travelRisk.safeToTravel ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400')}>
              {road.travelRisk.safeToTravel ? '✓ PASSABLE' : '✕ AVOID ROUTE'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            {statusCfg.publicGuidance}
          </p>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200/50 dark:border-white/5">
            * Prototype decision support. Obey on-ground police barricades and official disaster alerts.
          </div>
        </div>

        {/* ── 2. Blockage & Alternate Route Card ── */}
        {(road.status === 'BLOCKED' || road.status === 'PARTIALLY_BLOCKED' || road.status === 'CLOSED') && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-elevated/60 border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>{blockageCfg.icon}</span>
                <span>Obstruction: {blockageCfg.label}</span>
              </span>
              {road.estimatedDelayMinutes && (
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                  ~+{road.estimatedDelayMinutes}m delay
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {blockageCfg.description}
            </p>

            {road.alternateRoute && (
              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                <Navigation className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-accent">Recommended Alternate:</span>{' '}
                  <span className="font-medium">{road.alternateRoute}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3. Road Travel Risk Score (0–100) ── */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-elevated/60 border border-slate-200 dark:border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">⚡</span>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Road Travel Risk Score
              </span>
            </div>
            <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase', riskSevCfg.bg, riskSevCfg.color, riskSevCfg.border)}>
              {road.travelRisk.severity} ({road.travelRisk.score}/100)
            </span>
          </div>

          {/* Meter Bar */}
          <div className="space-y-1">
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  road.travelRisk.score >= 75
                    ? 'bg-rose-500'
                    : road.travelRisk.score >= 50
                    ? 'bg-orange-500'
                    : road.travelRisk.score >= 25
                    ? 'bg-amber-500'
                    : 'bg-emerald-500',
                )}
                style={{ width: `${Math.max(6, road.travelRisk.score)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-400">
              <span>0 LOW</span>
              <span>25 MOD</span>
              <span>50 HIGH</span>
              <span>75 CRITICAL</span>
            </div>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {road.travelRisk.explanation}
          </p>

          {/* Contributing Factors */}
          {road.travelRisk.factors.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-200/60 dark:border-white/5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Contributing Risk Factors:
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                {road.travelRisk.factors.map((factor, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-accent mt-0.5">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── 4. Connected Ground Intelligence (Citizen Reports) ── */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-accent" />
              <span>Corroborating Ground Reports</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {matchingReports.length || road.relatedReportIds.length} report(s)
            </span>
          </div>

          {matchingReports.length > 0 ? (
            <div className="space-y-2">
              {matchingReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => onSelectReport?.(report)}
                  className="p-2.5 rounded-lg bg-white dark:bg-surface-elevated/70 border border-slate-200 dark:border-white/10 hover:border-accent cursor-pointer transition-all space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-accent">
                      {report.title}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                      {report.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[9px] text-slate-400 font-mono">
                    <span>{report.confirmCount} confirms</span>
                    {report.evidence.length > 0 && <span>· {report.evidence.length} evidence file(s)</span>}
                    <span className="ml-auto text-accent flex items-center gap-0.5">
                      View report <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              No direct citizen reports linked. Status driven by government field patrols and active telemetry.
            </p>
          )}
        </div>

        {/* ── 5. Connected Critical Infrastructure ── */}
        {(road.connectsShelters?.length || road.connectsHospitals?.length) ? (
          <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20 space-y-2 text-xs">
            <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
              <Hospital className="w-3.5 h-3.5" />
              <span>Served Critical Destinations</span>
            </div>

            <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
              {road.connectsShelters && road.connectsShelters.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-accent">🏛️</span>
                  <span>Primary Evacuation Route for <strong>{road.connectsShelters.length}</strong> designated shelter(s)</span>
                </div>
              )}
              {road.connectsHospitals && road.connectsHospitals.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-rose-500">🏥</span>
                  <span>Arterial Medical Route for regional trauma / district hospital</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ── 6. Authority Verification Status & Action Bar ── */}
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
                {authorityMode ? 'Exit Review' : 'Authority Triage Mode'}
              </button>
            )}
          </div>

          {/* Official Verification Details */}
          {road.authorityVerification.reviewedAt ? (
            <div className="p-2.5 rounded bg-white dark:bg-surface-base border border-slate-200 dark:border-white/10 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {road.authorityVerification.reviewedBy}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {road.authorityVerification.status}
                </span>
              </div>
              {road.authorityVerification.notes && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {road.authorityVerification.notes}
                </p>
              )}
              {road.authorityVerification.actionTaken && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Action: {road.authorityVerification.actionTaken}
                </p>
              )}
              <div className="text-[9px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-white/5">
                Timestamp: {new Date(road.authorityVerification.reviewedAt).toLocaleString('en-IN')}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              Status calculated from predictive telemetry. Awaiting official field verification by Traffic Police / ODRAF.
            </p>
          )}

          {/* Authority Action Execution (When in Authority Mode) */}
          {allowAuthorityActions && authorityMode && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Execute Road Operational Action:
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPendingAction('VERIFY_BLOCKAGE')}
                  className={cn(
                    'py-1.5 px-2 rounded border font-semibold flex items-center justify-center gap-1 transition-all',
                    pendingAction === 'VERIFY_BLOCKAGE'
                      ? 'bg-rose-500 text-white border-rose-600'
                      : 'border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10',
                  )}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>VERIFY BLOCKAGE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingAction('MARK_OPEN')}
                  className={cn(
                    'py-1.5 px-2 rounded border font-semibold flex items-center justify-center gap-1 transition-all',
                    pendingAction === 'MARK_OPEN'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-600'
                      : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10',
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>MARK OPEN</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingAction('MARK_PARTIALLY_BLOCKED')}
                  className={cn(
                    'py-1.5 px-2 rounded border font-semibold flex items-center justify-center gap-1 transition-all',
                    pendingAction === 'MARK_PARTIALLY_BLOCKED'
                      ? 'bg-orange-500 text-white border-orange-600'
                      : 'border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10',
                  )}
                >
                  <span>🚧 PARTIAL PASS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingAction('MARK_CLOSED')}
                  className={cn(
                    'py-1.5 px-2 rounded border font-semibold flex items-center justify-center gap-1 transition-all',
                    pendingAction === 'MARK_CLOSED'
                      ? 'bg-red-700 text-white border-red-800'
                      : 'border-red-600/40 text-red-500 hover:bg-red-500/10',
                  )}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>MARK CLOSED</span>
                </button>
              </div>

              {/* Action confirmation dialog */}
              {pendingAction && (
                <div className="p-3 rounded-lg bg-white dark:bg-surface-card border border-slate-300 dark:border-white/15 space-y-2 shadow-lg animate-fade-in">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Confirm Transition to {pendingAction.replace('_', ' ')}
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
                    placeholder="Field inspection remarks, detour notes, or crew assignments..."
                    className="w-full text-xs p-2 rounded bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 resize-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPendingAction(null)}
                      className="px-3 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAction}
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
