/**
 * Incident Management Engine
 *
 * Deterministic CRUD, priority calculation, status transitions, and audit.
 * All state is kept in-memory (fits the existing demo architecture).
 * Future: replace store with a real DB / server actions without changing the UI.
 */

import type { Role } from '@/types/roles';
import type {
  ActionStatus,
  AddActionInput,
  AssignTeamInput,
  AuditRecord,
  CreateIncidentInput,
  EscalateInput,
  Incident,
  IncidentAction,
  IncidentSeverity,
  IncidentStatus,
  OperationalPriority,
  TimelineEvent,
  UpdateStatusInput,
} from './types';
import { INCIDENT_STATUSES, VALID_TRANSITIONS, type IncidentType } from './types';

// ── Report → Incident Mappers ────────────────────────────────────────────────

export function mapReportTypeToIncidentType(reportType: string): IncidentType {
  switch (reportType) {
    case 'FLOOD':
    case 'WATER_LEVEL':
      return 'FLOOD';
    case 'CYCLONE':
      return 'CYCLONE';
    case 'BLOCKED_ROAD':
    case 'DAMAGED_ROAD':
      return 'ROAD_BLOCKAGE';
    case 'DAMAGED_BUILDING':
    case 'INFRASTRUCTURE_DAMAGE':
    case 'POWER_OUTAGE':
      return 'INFRASTRUCTURE_DAMAGE';
    case 'MEDICAL_EMERGENCY':
      return 'MEDICAL_EMERGENCY';
    case 'SHELTER_ISSUE':
      return 'SHELTER_OVERLOAD';
    case 'LANDSLIDE':
      return 'LANDSLIDE';
    case 'FIRE':
      return 'FIRE';
    case 'MISSING_PERSON':
      return 'MISSING_PERSON';
    default:
      return 'OTHER';
  }
}

export function mapReportSeverityToIncidentSeverity(severity: string): IncidentSeverity {
  switch (severity) {
    case 'CRITICAL': return 'CRITICAL';
    case 'HIGH':     return 'HIGH';
    case 'MODERATE': return 'MEDIUM';
    case 'LOW':      return 'LOW';
    default:         return 'MEDIUM';
  }
}

// ── ID helpers ────────────────────────────────────────────────────────────────

let _incidentSeq = 1000;
let _timelineSeq = 5000;
let _auditSeq    = 9000;
let _actionSeq   = 3000;

function incId():  string { return `INC-${++_incidentSeq}`; }
function tlId():   string { return `TL-${++_timelineSeq}`; }
function audId():  string { return `AUD-${++_auditSeq}`; }
function actId():  string { return `ACT-${++_actionSeq}`; }

// ── Priority engine ───────────────────────────────────────────────────────────

const SEVERITY_BASE: Record<IncidentSeverity, number> = {
  CRITICAL: 85,
  HIGH:     65,
  MEDIUM:   40,
  LOW:      20,
};

export function calculatePriority(
  severity: IncidentSeverity,
  options?: {
    affectedPopulation?: number;
    activeAlertCount?: number;
    escalationLevel?: number;
    hasRoadBlock?: boolean;
    hasShelterPressure?: boolean;
  },
): OperationalPriority {
  let score = SEVERITY_BASE[severity];
  const factors: string[] = [`Base severity: ${severity}`];

  const pop = options?.affectedPopulation ?? 0;
  if (pop > 100_000) { score += 8; factors.push('Large affected population (>1 lakh)'); }
  else if (pop > 10_000) { score += 4; factors.push('Significant affected population (>10K)'); }

  const alerts = options?.activeAlertCount ?? 0;
  if (alerts > 0) { score += Math.min(alerts * 3, 10); factors.push(`${alerts} active alert(s) in area`); }

  const esc = options?.escalationLevel ?? 0;
  if (esc > 0) { score += Math.min(esc * 5, 15); factors.push(`Escalation level ${esc}`); }

  if (options?.hasRoadBlock) { score += 5; factors.push('Critical road access blocked'); }
  if (options?.hasShelterPressure) { score += 5; factors.push('Shelter capacity under pressure'); }

  score = Math.min(Math.max(score, 0), 100);

  const level: IncidentSeverity =
    score >= 80 ? 'CRITICAL' :
    score >= 55 ? 'HIGH' :
    score >= 30 ? 'MEDIUM' : 'LOW';

  return { score, level, factors };
}

// ── Timeline / audit helpers ──────────────────────────────────────────────────

function tlEvent(
  kind: TimelineEvent['kind'],
  actor: string,
  actorRole: Role,
  summary: string,
  detail?: string,
): TimelineEvent {
  return { id: tlId(), kind, actor, actorRole, timestamp: new Date().toISOString(), summary, detail };
}

function audEvent(
  incidentId: string,
  actor: string,
  actorRole: Role,
  action: string,
  before?: string,
  after?: string,
  context?: string,
): AuditRecord {
  return { id: audId(), incidentId, actor, actorRole, action, timestamp: new Date().toISOString(), before, after, context };
}

// ── Status transition guard ────────────────────────────────────────────────────

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// ── Create ────────────────────────────────────────────────────────────────────

export function createIncident(input: CreateIncidentInput): Incident {
  const id  = incId();
  const now = new Date().toISOString();

  const priority = calculatePriority(input.severity, {
    affectedPopulation: input.affectedPopulation,
    activeAlertCount:   input.relatedAlertIds?.length ?? 0,
  });

  const tl = tlEvent('CREATED', input.createdBy, input.createdByRole,
    `Incident created by ${input.createdBy}`,
    `Source: ${input.source}. ${input.description.slice(0, 80)}...`,
  );

  const aud = audEvent(id, input.createdBy, input.createdByRole,
    'INCIDENT_CREATED', undefined, input.severity,
    `Type: ${input.incidentType}, Location: ${input.locationName}`,
  );

  return {
    id,
    title:            input.title,
    description:      input.description,
    incidentType:     input.incidentType,
    hazardType:       input.hazardType,
    severity:         input.severity,
    priority,
    status:           INCIDENT_STATUSES.NEW,
    locationName:     input.locationName,
    coordinates:      input.coordinates,
    affectedArea:     input.affectedArea,
    source:           input.source,
    sourceReference:  input.sourceReference,
    dataLabel:        input.dataLabel,
    createdAt:        now,
    updatedAt:        now,
    createdBy:        input.createdBy,
    createdByRole:    input.createdByRole,
    escalationLevel:  0,
    actions:          [],
    timeline:         [tl],
    auditLog:         [aud],
    relatedAlertIds:  input.relatedAlertIds ?? [],
    relatedReportIds: input.relatedReportIds ?? [],
    relatedRoadIds:   input.relatedRoadIds ?? [],
    relatedShelterIds:input.relatedShelterIds ?? [],
    affectedPopulation: input.affectedPopulation,
    evidence:         input.evidence ?? [],
  };
}

// ── Update status ─────────────────────────────────────────────────────────────

export function updateStatus(
  incident: Incident,
  input: Omit<UpdateStatusInput, 'incidentId'>,
): { success: boolean; incident: Incident; error?: string } {
  if (!canTransition(incident.status, input.newStatus)) {
    return {
      success: false,
      incident,
      error: `Cannot transition from ${incident.status} to ${input.newStatus}.`,
    };
  }

  const now = new Date().toISOString();
  const resolvedAt = input.newStatus === 'RESOLVED' ? now : incident.resolvedAt;

  const kind: TimelineEvent['kind'] =
    input.newStatus === 'ESCALATED' ? 'ESCALATED' :
    input.newStatus === 'RESOLVED'  ? 'RESOLVED' :
    input.newStatus === 'CLOSED'    ? 'CLOSED' :
    input.newStatus === 'NEW'       ? 'REOPENED' : 'STATUS_CHANGED';

  const tl  = tlEvent(kind, input.actor, input.actorRole,
    `Status changed to ${input.newStatus}`,
    input.reason,
  );
  const aud = audEvent(incident.id, input.actor, input.actorRole,
    'STATUS_CHANGED', incident.status, input.newStatus, input.reason,
  );

  return {
    success: true,
    incident: {
      ...incident,
      status:    input.newStatus,
      updatedAt: now,
      resolvedAt,
      timeline:  [...incident.timeline, tl],
      auditLog:  [...incident.auditLog, aud],
    },
  };
}

// ── Assign team ───────────────────────────────────────────────────────────────

export function assignTeam(
  incident: Incident,
  input: Omit<AssignTeamInput, 'incidentId'>,
): Incident {
  const now = new Date().toISOString();
  const assignment = {
    team:       input.team,
    officer:    input.officer,
    assignedAt: now,
    assignedBy: input.assignedBy,
    status:     'ACTIVE' as const,
  };

  const tl  = tlEvent('ASSIGNED', input.assignedBy, input.assignedByRole,
    `${input.team} assigned — Officer: ${input.officer}`,
  );
  const aud = audEvent(incident.id, input.assignedBy, input.assignedByRole,
    'TEAM_ASSIGNED', incident.assignedTeam?.team, input.team,
    `Officer: ${input.officer}`,
  );

  // Auto-advance to ASSIGNED if in TRIAGED or NEW
  const autoAdvance =
    incident.status === 'NEW' || incident.status === 'TRIAGED'
      ? { status: 'ASSIGNED' as IncidentStatus }
      : {};

  return {
    ...incident,
    ...autoAdvance,
    assignedTeam:    assignment,
    assignedOfficer: input.officer,
    updatedAt:       now,
    timeline:        [...incident.timeline, tl],
    auditLog:        [...incident.auditLog, aud],
  };
}

// ── Add action ────────────────────────────────────────────────────────────────

export function addAction(
  incident: Incident,
  input: Omit<AddActionInput, 'incidentId'>,
): Incident {
  const now = new Date().toISOString();
  const action: IncidentAction = {
    id:        actId(),
    title:     input.title,
    owner:     input.owner,
    status:    'TODO',
    priority:  input.priority,
    dueAt:     input.dueAt,
    createdAt: now,
  };

  const tl  = tlEvent('ACTION_ADDED', input.addedBy, input.addedByRole,
    `Action added: "${input.title}" — Owner: ${input.owner}`,
  );
  const aud = audEvent(incident.id, input.addedBy, input.addedByRole,
    'ACTION_CREATED', undefined, action.id,
    `Title: ${input.title}`,
  );

  return {
    ...incident,
    updatedAt: now,
    actions:   [...incident.actions, action],
    timeline:  [...incident.timeline, tl],
    auditLog:  [...incident.auditLog, aud],
  };
}

// ── Update action status ──────────────────────────────────────────────────────

export function updateActionStatus(
  incident: Incident,
  actionId: string,
  newStatus: ActionStatus,
  actor: string,
  actorRole: Role,
): Incident {
  const now = new Date().toISOString();
  const actions = incident.actions.map((a) =>
    a.id === actionId
      ? { ...a, status: newStatus, completedAt: newStatus === 'COMPLETED' ? now : a.completedAt }
      : a,
  );

  const tl = newStatus === 'COMPLETED'
    ? tlEvent('ACTION_COMPLETED', actor, actorRole,
        `Action completed: "${incident.actions.find((a) => a.id === actionId)?.title}"`,
      )
    : undefined;

  const aud = audEvent(incident.id, actor, actorRole,
    'ACTION_STATUS_CHANGED', undefined, newStatus, `Action: ${actionId}`,
  );

  return {
    ...incident,
    updatedAt: now,
    actions,
    timeline:  tl ? [...incident.timeline, tl] : incident.timeline,
    auditLog:  [...incident.auditLog, aud],
  };
}

// ── Escalate ──────────────────────────────────────────────────────────────────

export function escalateIncident(
  incident: Incident,
  input: Omit<EscalateInput, 'incidentId'>,
): Incident {
  const now   = new Date().toISOString();
  const level = incident.escalationLevel + 1;

  const newSeverity: IncidentSeverity =
    level >= 3 ? 'CRITICAL' :
    level >= 2 ? 'HIGH' :
    'HIGH';

  const tl  = tlEvent('ESCALATED', input.actor, input.actorRole,
    `Incident escalated to level ${level} — ${newSeverity}`,
    input.reason,
  );
  const aud = audEvent(incident.id, input.actor, input.actorRole,
    'INCIDENT_ESCALATED',
    `Level ${incident.escalationLevel} / ${incident.severity}`,
    `Level ${level} / ${newSeverity}`,
    input.reason,
  );

  const priority = calculatePriority(newSeverity, {
    affectedPopulation: incident.affectedPopulation,
    escalationLevel:    level,
    activeAlertCount:   incident.relatedAlertIds.length,
  });

  return {
    ...incident,
    status:           'ESCALATED',
    severity:         newSeverity,
    priority,
    escalationLevel:  level,
    escalationReason: input.reason,
    updatedAt:        now,
    timeline:         [...incident.timeline, tl],
    auditLog:         [...incident.auditLog, aud],
  };
}

// ── Add timeline note ─────────────────────────────────────────────────────────

export function addFieldNote(
  incident: Incident,
  note: string,
  actor: string,
  actorRole: Role,
): Incident {
  const now = new Date().toISOString();
  const tl  = tlEvent('FIELD_UPDATE', actor, actorRole, note);
  const aud = audEvent(incident.id, actor, actorRole, 'NOTE_ADDED', undefined, undefined, note);
  return {
    ...incident,
    updatedAt: now,
    timeline:  [...incident.timeline, tl],
    auditLog:  [...incident.auditLog, aud],
  };
}
