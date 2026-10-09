/**
 * Emergency Incident Management — Types
 *
 * Provides the full incident lifecycle model:
 * NEW → TRIAGED → ASSIGNED → IN_PROGRESS → ESCALATED → RESOLVED → CLOSED
 *
 * Integrates with existing RBAC, alerts, reports, roads, shelters and resources.
 */

import type { HazardType } from '@/types';
import type { Role } from '@/types/roles';

// ── Incident Types ────────────────────────────────────────────────────────────

export const INCIDENT_TYPES = {
  FLOOD:                'FLOOD',
  CYCLONE:              'CYCLONE',
  ROAD_BLOCKAGE:        'ROAD_BLOCKAGE',
  SHELTER_OVERLOAD:     'SHELTER_OVERLOAD',
  RESOURCE_SHORTAGE:    'RESOURCE_SHORTAGE',
  MEDICAL_EMERGENCY:    'MEDICAL_EMERGENCY',
  INFRASTRUCTURE_DAMAGE:'INFRASTRUCTURE_DAMAGE',
  CITIZEN_REPORT:       'CITIZEN_REPORT',
  EVACUATION:           'EVACUATION',
  LANDSLIDE:            'LANDSLIDE',
  FIRE:                 'FIRE',
  MISSING_PERSON:       'MISSING_PERSON',
  OTHER:                'OTHER',
} as const;
export type IncidentType = (typeof INCIDENT_TYPES)[keyof typeof INCIDENT_TYPES];

// ── Incident Status Workflow ──────────────────────────────────────────────────

export const INCIDENT_STATUSES = {
  NEW:         'NEW',
  TRIAGED:     'TRIAGED',
  ASSIGNED:    'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  ESCALATED:   'ESCALATED',
  RESOLVED:    'RESOLVED',
  CLOSED:      'CLOSED',
} as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[keyof typeof INCIDENT_STATUSES];

/** Valid forward transitions — prevents arbitrary status jumps */
export const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  NEW:         ['TRIAGED', 'ESCALATED'],
  TRIAGED:     ['ASSIGNED', 'ESCALATED', 'RESOLVED'],
  ASSIGNED:    ['IN_PROGRESS', 'ESCALATED'],
  IN_PROGRESS: ['ESCALATED', 'RESOLVED'],
  ESCALATED:   ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'],
  RESOLVED:    ['CLOSED', 'NEW'],           // reopen → NEW
  CLOSED:      [],
};

// ── Incident Severity ─────────────────────────────────────────────────────────

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// ── Source ────────────────────────────────────────────────────────────────────

export type IncidentSource =
  | 'CITIZEN_REPORT'
  | 'ACTIVE_ALERT'
  | 'BLOCKED_ROAD'
  | 'RESOURCE_SHORTAGE'
  | 'SHELTER_PRESSURE'
  | 'RISK_HOTSPOT'
  | 'MANUAL'
  | 'SYSTEM_GENERATED';

export type DataLabel =
  | 'SIMULATION'
  | 'VERIFIED'
  | 'PREDICTED'
  | 'CITIZEN_REPORT'
  | 'HISTORICAL'
  | 'SYSTEM_GENERATED'
  | 'LIVE_UPDATED';

// ── Response Teams ────────────────────────────────────────────────────────────

export const RESPONSE_TEAMS = {
  RESCUE:              'RESCUE',
  MEDICAL:             'MEDICAL',
  ROAD_CLEARANCE:      'ROAD_CLEARANCE',
  SHELTER_SUPPORT:     'SHELTER_SUPPORT',
  LOGISTICS:           'LOGISTICS',
  FIELD_ASSESSMENT:    'FIELD_ASSESSMENT',
  EMERGENCY_COORD:     'EMERGENCY_COORD',
} as const;
export type ResponseTeam = (typeof RESPONSE_TEAMS)[keyof typeof RESPONSE_TEAMS];

export interface TeamAssignment {
  team:           ResponseTeam;
  officer:        string;
  assignedAt:     string;
  assignedBy:     string;
  status:         'ACTIVE' | 'EN_ROUTE' | 'ON_SITE' | 'COMPLETED';
}

// ── Operational Actions ───────────────────────────────────────────────────────

export type ActionStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface IncidentAction {
  id:          string;
  title:       string;
  owner:       string;
  status:      ActionStatus;
  priority:    IncidentSeverity;
  dueAt?:      string;
  createdAt:   string;
  completedAt?: string;
  note?:       string;
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export type TimelineEventKind =
  | 'CREATED'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'ESCALATED'
  | 'DE_ESCALATED'
  | 'STATUS_CHANGED'
  | 'ACTION_ADDED'
  | 'ACTION_COMPLETED'
  | 'FIELD_UPDATE'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'NOTE_ADDED';

export interface TimelineEvent {
  id:        string;
  kind:      TimelineEventKind;
  actor:     string;
  actorRole: Role;
  timestamp: string;
  summary:   string;
  detail?:   string;
}

// ── Audit Record ──────────────────────────────────────────────────────────────

export interface AuditRecord {
  id:         string;
  incidentId: string;
  actor:      string;
  actorRole:  Role;
  action:     string;
  timestamp:  string;
  before?:    string;
  after?:     string;
  context?:   string;
}

// ── Operational Priority ──────────────────────────────────────────────────────

export interface OperationalPriority {
  score:    number;   // 0–100, higher = more urgent
  level:    IncidentSeverity;
  factors:  string[];
}

// ── Main Incident Model ───────────────────────────────────────────────────────

export interface Incident {
  id:               string;
  title:            string;
  description:      string;
  incidentType:     IncidentType;
  hazardType:       HazardType;
  severity:         IncidentSeverity;
  priority:         OperationalPriority;
  status:           IncidentStatus;

  // Location
  locationName:     string;
  coordinates?:     [number, number];
  affectedArea?:    string;

  // Source traceability
  source:           IncidentSource;
  sourceReference?: string;   // e.g. report id, alert id
  dataLabel:        DataLabel;

  // Timestamps
  createdAt:        string;
  updatedAt:        string;
  dueAt?:           string;
  resolvedAt?:      string;

  // Ownership
  createdBy:        string;
  createdByRole:    Role;
  assignedTeam?:    TeamAssignment;
  assignedOfficer?: string;

  // Escalation
  escalationLevel:  number;   // 0 = base, higher = more escalated
  escalationReason?: string;

  // Operational data
  actions:          IncidentAction[];
  timeline:         TimelineEvent[];
  auditLog:         AuditRecord[];

  // Related intelligence (ids, not full objects)
  relatedAlertIds:   string[];
  relatedReportIds:  string[];
  relatedRoadIds:    string[];
  relatedShelterIds: string[];

  // Counts for quick display
  affectedPopulation?: number;
  evidence?:          import('@/lib/reports/evidence/types').StructuredReportEvidence[];
}

// ── Create Input ──────────────────────────────────────────────────────────────

export interface CreateIncidentInput {
  title:            string;
  description:      string;
  incidentType:     IncidentType;
  hazardType:       HazardType;
  severity:         IncidentSeverity;
  locationName:     string;
  coordinates?:     [number, number];
  affectedArea?:    string;
  source:           IncidentSource;
  sourceReference?: string;
  dataLabel:        DataLabel;
  createdBy:        string;
  createdByRole:    Role;
  affectedPopulation?: number;
  relatedAlertIds?:   string[];
  relatedReportIds?:  string[];
  relatedRoadIds?:    string[];
  relatedShelterIds?: string[];
  evidence?:          import('@/lib/reports/evidence/types').StructuredReportEvidence[];
}

// ── Update Input ──────────────────────────────────────────────────────────────

export interface UpdateStatusInput {
  incidentId: string;
  newStatus:  IncidentStatus;
  actor:      string;
  actorRole:  Role;
  reason?:    string;
}

export interface AssignTeamInput {
  incidentId: string;
  team:       ResponseTeam;
  officer:    string;
  assignedBy: string;
  assignedByRole: Role;
}

export interface AddActionInput {
  incidentId: string;
  title:      string;
  owner:      string;
  priority:   IncidentSeverity;
  dueAt?:     string;
  addedBy:    string;
  addedByRole: Role;
}

export interface EscalateInput {
  incidentId: string;
  reason:     string;
  actor:      string;
  actorRole:  Role;
}
