'use client';

/**
 * IncidentDetailPanel
 *
 * Full operational detail for a selected incident.
 * Shows: Situation, Severity/Priority, Source, Assignment,
 *        Timeline, Actions, Related Intelligence, Escalation controls.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  X, MapPin, Clock, Users, Shield, ChevronDown, ChevronUp,
  CheckCircle2, Zap, FileText, TrendingUp, Camera, ExternalLink, ArrowRight,
} from 'lucide-react';
import { EvidencePreview } from '@/components/reports/EvidencePreview';
import { cn, timeAgo, formatNumber } from '@/lib/utils';
import {
  INCIDENT_STATUS_CONFIG,
  INCIDENT_SEVERITY_CONFIG,
  INCIDENT_TYPE_ICON,
  TEAM_LABEL,
  DATA_LABEL_CONFIG,
  VALID_TRANSITIONS,
  updateStatus,
  assignTeam,
  addAction,
  escalateIncident,
  addFieldNote,
  updateActionStatus,
  type Incident,
  type IncidentStatus,
  type ResponseTeam,
} from '@/lib/incidents';
import type { Role } from '@/types/roles';
import { ROLES } from '@/types/roles';
import { rolePermissions } from '@/types/roles';

// ── Permission helpers ────────────────────────────────────────────────────────

function canManage(role: Role): boolean {
  return rolePermissions[role]?.canManageAlerts ?? false;
}

// ── Timeline entry ────────────────────────────────────────────────────────────

function TimelineEntry({ event }: { event: Incident['timeline'][0] }) {
  const kindIcon: Record<string, string> = {
    CREATED:          '🆕',
    TRIAGED:          '🔍',
    ASSIGNED:         '👤',
    ESCALATED:        '⬆️',
    DE_ESCALATED:     '⬇️',
    STATUS_CHANGED:   '🔄',
    ACTION_ADDED:     '➕',
    ACTION_COMPLETED: '✅',
    FIELD_UPDATE:     '📋',
    RESOLVED:         '✔️',
    CLOSED:           '🔒',
    REOPENED:         '🔓',
    NOTE_ADDED:       '📝',
  };

  return (
    <div className="flex gap-3 text-xs">
      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
        <div className="text-sm">{kindIcon[event.kind] ?? '•'}</div>
        <div className="w-px flex-1 bg-slate-200 dark:bg-white/10 min-h-[1rem]" />
      </div>
      <div className="pb-3 min-w-0">
        <div className="font-medium text-slate-800 dark:text-slate-200">{event.summary}</div>
        {event.detail && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{event.detail}</div>}
        <div className="text-[10px] text-slate-400 mt-1 font-mono">
          {new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          {' · '}{event.actor}
        </div>
      </div>
    </div>
  );
}

// ── Action row ────────────────────────────────────────────────────────────────

function ActionRow({
  action,
  onStatusChange,
  canEdit,
}: {
  action: Incident['actions'][0];
  onStatusChange: (id: string, s: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED') => void;
  canEdit: boolean;
}) {
  const statusColor = {
    TODO:        'text-slate-500',
    IN_PROGRESS: 'text-amber-600 dark:text-amber-400',
    COMPLETED:   'text-emerald-600 dark:text-emerald-400',
    BLOCKED:     'text-rose-600 dark:text-rose-400',
  }[action.status];

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
      <div className="min-w-0">
        <div className={cn('text-xs font-medium', action.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200')}>
          {action.title}
        </div>
        <div className="text-[10px] text-slate-400">{action.owner}</div>
      </div>
      {canEdit ? (
        <select
          value={action.status}
          onChange={(e) => onStatusChange(action.id, e.target.value as 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED')}
          className={cn(
            'text-[10px] font-bold px-2 py-1 rounded border bg-white dark:bg-surface-card flex-shrink-0',
            'border-slate-200 dark:border-white/10 cursor-pointer',
            statusColor,
          )}
        >
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="BLOCKED">BLOCKED</option>
        </select>
      ) : (
        <span className={cn('text-[10px] font-bold flex-shrink-0', statusColor)}>{action.status}</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface IncidentDetailPanelProps {
  incident:        Incident;
  role:            Role;
  onClose?:        () => void;
  onUpdate:        (updated: Incident) => void;
  className?:      string;
}

export function IncidentDetailPanel({
  incident: initialIncident,
  role,
  onClose,
  onUpdate,
  className,
}: IncidentDetailPanelProps) {
  const [incident, setIncident] = useState<Incident>(initialIncident);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showActions, setShowActions]   = useState(true);
  const [showAudit, setShowAudit]       = useState(false);

  // Form state
  const [assignTeamVal,    setAssignTeamVal]    = useState<ResponseTeam>('RESCUE');
  const [assignOfficer,    setAssignOfficer]    = useState('');
  const [actionTitle,      setActionTitle]      = useState('');
  const [actionOwner,      setActionOwner]      = useState('');
  const [escalateReason,   setEscalateReason]   = useState('');
  const [noteText,         setNoteText]         = useState('');
  const [activeSection,    setActiveSection]    = useState<string | null>(null);

  const isManager = canManage(role);
  const actor = role === ROLES.STATE_AUTHORITY ? 'Dr. Suresh Mohapatra'
    : role === ROLES.DISTRICT_AUTHORITY ? 'Priyadarshini Sahoo (IAS)'
    : role === ROLES.OPERATIONS ? 'Cmdr. R. K. Verma'
    : 'B. K. Pradhan (BDO)';

  const update = useCallback((updated: Incident) => {
    setIncident(updated);
    onUpdate(updated);
  }, [onUpdate]);

  const handleStatusChange = (status: IncidentStatus) => {
    const result = updateStatus(incident, { newStatus: status, actor, actorRole: role });
    if (result.success) update(result.incident);
  };

  const handleAssign = () => {
    if (!assignOfficer.trim()) return;
    update(assignTeam(incident, { team: assignTeamVal, officer: assignOfficer, assignedBy: actor, assignedByRole: role }));
    setAssignOfficer('');
    setActiveSection(null);
  };

  const handleAddAction = () => {
    if (!actionTitle.trim() || !actionOwner.trim()) return;
    update(addAction(incident, { title: actionTitle, owner: actionOwner, priority: incident.severity, addedBy: actor, addedByRole: role }));
    setActionTitle('');
    setActionOwner('');
    setActiveSection(null);
  };

  const handleEscalate = () => {
    if (!escalateReason.trim()) return;
    update(escalateIncident(incident, { reason: escalateReason, actor, actorRole: role }));
    setEscalateReason('');
    setActiveSection(null);
  };

  const handleNote = () => {
    if (!noteText.trim()) return;
    update(addFieldNote(incident, noteText, actor, role));
    setNoteText('');
    setActiveSection(null);
  };

  const handleActionStatus = (id: string, s: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED') => {
    update(updateActionStatus(incident, id, s, actor, role));
  };

  const statusCfg   = INCIDENT_STATUS_CONFIG[incident.status];
  const severityCfg = INCIDENT_SEVERITY_CONFIG[incident.severity];
  const icon        = INCIDENT_TYPE_ICON[incident.incidentType];
  const dataLabelCfg = DATA_LABEL_CONFIG[incident.dataLabel];
  const validNext    = VALID_TRANSITIONS[incident.status];

  return (
    <div className={cn(
      'flex flex-col w-full h-full bg-white dark:bg-surface-card',
      'border-l border-slate-200 dark:border-white/[0.06]',
      className,
    )}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2 px-4 py-4 border-b border-slate-200 dark:border-white/[0.06] flex-shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-base">{icon}</span>
            <span className="text-[10px] font-mono text-slate-400">{incident.id}</span>
            <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded', dataLabelCfg.color, dataLabelCfg.bg)}>
              {dataLabelCfg.label}
            </span>
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {incident.title}
          </h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Severity + Status badges */}
        <div className="flex flex-wrap gap-2">
          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', severityCfg.color, severityCfg.bg, severityCfg.border)}>
            {severityCfg.label}
          </span>
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1', statusCfg.color, statusCfg.bg, statusCfg.border)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
            {statusCfg.label}
          </span>
          {incident.escalationLevel > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full border text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30">
              ⬆️ Escalation Level {incident.escalationLevel}
            </span>
          )}
        </div>

        {/* Operational Priority */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Operational Priority
            </span>
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
              {incident.priority.score}/100
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className={cn('h-full rounded-full', incident.priority.score >= 80 ? 'bg-rose-500' : incident.priority.score >= 55 ? 'bg-orange-500' : incident.priority.score >= 30 ? 'bg-amber-500' : 'bg-emerald-500')}
              style={{ width: `${incident.priority.score}%` }}
            />
          </div>
          <ul className="space-y-0.5">
            {incident.priority.factors.slice(0, 3).map((f) => (
              <li key={f} className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
                <span className="text-slate-400">▸</span>{f}
              </li>
            ))}
          </ul>
        </div>

        {/* Situation */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Situation</div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/[0.02] p-3 rounded-lg border border-slate-200 dark:border-white/10">
            {incident.description}
          </p>
        </div>

        {/* Location + Meta */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
            <div className="text-[9px] font-bold uppercase text-slate-400 mb-1">Location</div>
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
              <MapPin className="w-3 h-3 text-accent flex-shrink-0" />
              <span className="line-clamp-1">{incident.locationName}</span>
            </div>
            {incident.affectedArea && <div className="text-[10px] text-slate-500 mt-0.5">{incident.affectedArea}</div>}
            {incident.coordinates && (
              <div className="mt-1 pt-1 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-mono text-slate-500">
                  {incident.coordinates[1].toFixed(4)}°N, {incident.coordinates[0].toFixed(4)}°E
                </span>
                <Link
                  href="/map"
                  className="text-[9px] text-accent hover:underline flex items-center gap-0.5"
                >
                  <span>Map</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            )}
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
            <div className="text-[9px] font-bold uppercase text-slate-400 mb-1">Source & Traceability</div>
            <div className="text-slate-700 dark:text-slate-300 font-medium capitalize text-xs">
              {incident.source.toLowerCase().replace('_', ' ')}
            </div>
            {incident.sourceReference && (
              <div className="text-[10px] font-mono text-cyan-600 dark:text-accent mt-0.5">Ref: {incident.sourceReference}</div>
            )}
            <div className="text-[9px] text-slate-400 mt-1">Reported by: {incident.createdBy}</div>
          </div>
        </div>

        {/* Evidence Photos (if attached) */}
        {incident.evidence && incident.evidence.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-accent" />
                Attached Evidence Photos ({incident.evidence.length})
              </span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                ✓ Ground Evidence Logged
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {incident.evidence.map((ev) => (
                <EvidencePreview key={ev.id} evidence={ev} size="sm" readOnly />
              ))}
            </div>
          </div>
        )}

        {/* Response & Logistics Workflow Continuity (Step 19) */}
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>Operational Response Workflow</span>
            <span className="text-[10px] text-accent font-normal">Next Steps</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            <Link
              href="/operations"
              className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-accent/40 text-center transition-colors group"
            >
              <div className="text-base group-hover:scale-110 transition-transform">🚛</div>
              <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 mt-1">Field Ops</div>
            </Link>
            <Link
              href="/shelters"
              className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-accent/40 text-center transition-colors group"
            >
              <div className="text-base group-hover:scale-110 transition-transform">⛺</div>
              <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 mt-1">Shelters</div>
            </Link>
            <Link
              href="/resources"
              className="p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-accent/40 text-center transition-colors group"
            >
              <div className="text-base group-hover:scale-110 transition-transform">📦</div>
              <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 mt-1">Resources</div>
            </Link>
          </div>
        </div>

        {/* Affected population */}
        {incident.affectedPopulation && (
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
            <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Estimated affected: <strong className="text-slate-900 dark:text-slate-100">{formatNumber(incident.affectedPopulation)}</strong></span>
          </div>
        )}

        {/* Assignment */}
        <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Response Assignment
            </div>
            {isManager && (
              <button
                onClick={() => setActiveSection(activeSection === 'assign' ? null : 'assign')}
                className="text-[10px] text-accent hover:underline font-semibold"
              >
                {incident.assignedTeam ? 'Reassign' : 'Assign Team'}
              </button>
            )}
          </div>
          {incident.assignedTeam ? (
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-slate-800 dark:text-slate-200">{TEAM_LABEL[incident.assignedTeam.team]}</div>
              <div className="text-slate-500">Officer: {incident.assignedTeam.officer}</div>
              <div className="text-[10px] font-mono text-slate-400">{timeAgo(incident.assignedTeam.assignedAt)}</div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">No team assigned yet.</div>
          )}

          {activeSection === 'assign' && isManager && (
            <div className="space-y-2 pt-2 border-t border-violet-200 dark:border-violet-500/20">
              <select
                value={assignTeamVal}
                onChange={(e) => setAssignTeamVal(e.target.value as ResponseTeam)}
                className="w-full text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100"
              >
                {Object.entries(TEAM_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <input
                placeholder="Assigned officer name"
                value={assignOfficer}
                onChange={(e) => setAssignOfficer(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100"
              />
              <div className="flex gap-2">
                <button onClick={handleAssign} className="flex-1 py-1.5 rounded text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90">Assign</button>
                <button onClick={() => setActiveSection(null)} className="px-3 py-1.5 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Operational Actions */}
        <div>
          <button
            onClick={() => setShowActions((v) => !v)}
            className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Operational Actions ({incident.actions.length})
            </span>
            {showActions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showActions && (
            <div className="rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-white/5 px-3">
                {incident.actions.length === 0 && (
                  <div className="py-3 text-xs text-slate-400 italic text-center">No actions yet.</div>
                )}
                {incident.actions.map((a) => (
                  <ActionRow key={a.id} action={a} onStatusChange={handleActionStatus} canEdit={isManager} />
                ))}
              </div>
              {isManager && (
                <div className="border-t border-slate-200 dark:border-white/10 p-2">
                  {activeSection === 'action' ? (
                    <div className="space-y-1.5">
                      <input
                        placeholder="Action description"
                        value={actionTitle}
                        onChange={(e) => setActionTitle(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100"
                      />
                      <input
                        placeholder="Assigned to"
                        value={actionOwner}
                        onChange={(e) => setActionOwner(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleAddAction} className="flex-1 py-1.5 rounded text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90">Add Action</button>
                        <button onClick={() => setActiveSection(null)} className="px-3 py-1.5 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveSection('action')}
                      className="w-full py-1.5 text-xs font-semibold text-accent hover:bg-accent/5 rounded"
                    >
                      + Add Action
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status transitions */}
        {isManager && validNext.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Advance Status</div>
            <div className="flex flex-wrap gap-1.5">
              {validNext.map((s) => {
                const cfg = INCIDENT_STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={cn('text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors', cfg.color, cfg.bg, cfg.border, 'hover:opacity-80')}
                  >
                    → {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Escalation */}
        {isManager && incident.status !== 'ESCALATED' && incident.status !== 'RESOLVED' && incident.status !== 'CLOSED' && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Escalation
              </span>
              <button
                onClick={() => setActiveSection(activeSection === 'escalate' ? null : 'escalate')}
                className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
              >
                Escalate Incident
              </button>
            </div>
            {incident.escalationReason && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 italic">{incident.escalationReason}</div>
            )}
            {activeSection === 'escalate' && (
              <div className="space-y-1.5 pt-2 border-t border-rose-200 dark:border-rose-500/20">
                <textarea
                  rows={2}
                  placeholder="Escalation reason (required)"
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleEscalate} className="flex-1 py-1.5 rounded text-xs font-bold bg-rose-500 text-white hover:bg-rose-600">Confirm Escalation</button>
                  <button onClick={() => setActiveSection(null)} className="px-3 py-1.5 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Field Note */}
        {isManager && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Field Update
              </span>
              <button onClick={() => setActiveSection(activeSection === 'note' ? null : 'note')} className="text-[10px] text-accent hover:underline font-semibold">
                Add Note
              </button>
            </div>
            {activeSection === 'note' && (
              <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-white/10">
                <textarea
                  rows={2}
                  placeholder="Field observation or operational update..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-card text-slate-900 dark:text-slate-100 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleNote} className="flex-1 py-1.5 rounded text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90">Add Note</button>
                  <button onClick={() => setActiveSection(null)} className="px-3 py-1.5 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        <div>
          <button
            onClick={() => setShowTimeline((v) => !v)}
            className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Incident Timeline ({incident.timeline.length})
            </span>
            {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showTimeline && (
            <div className="pl-1">
              {[...incident.timeline].reverse().map((e) => (
                <TimelineEntry key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>

        {/* Audit log (collapsible, authority only) */}
        {isManager && (
          <div>
            <button
              onClick={() => setShowAudit((v) => !v)}
              className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Audit Log ({incident.auditLog.length})
              </span>
              {showAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showAudit && (
              <div className="rounded-lg border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                {[...incident.auditLog].reverse().map((rec) => (
                  <div key={rec.id} className="px-3 py-2 text-[10px] text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{rec.action}</span>
                      <span className="font-mono">{new Date(rec.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-slate-500 mt-0.5">{rec.actor} · {rec.context}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Related IDs */}
        {(incident.relatedAlertIds.length > 0 || incident.relatedReportIds.length > 0) && (
          <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-500/5 border border-sky-200 dark:border-sky-500/20 space-y-1.5">
            <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400">🌐 Related Intelligence</div>
            {incident.relatedAlertIds.map((id) => (
              <div key={id} className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">Alert: {id}</div>
            ))}
            {incident.relatedReportIds.map((id) => (
              <div key={id} className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">Report: {id}</div>
            ))}
          </div>
        )}

        {/* RBAC note for restricted roles */}
        {!isManager && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-[11px] text-slate-500 text-center">
            Read-only view. Management actions require STATE_AUTHORITY or DISTRICT_AUTHORITY role.
          </div>
        )}
      </div>
    </div>
  );
}
