export * from './engine';
export * from './store';
export * from './types';

// UI-facing display configs

import type { DataLabel, IncidentSeverity, IncidentStatus, IncidentType, ResponseTeam } from './types';

export const INCIDENT_STATUS_CONFIG: Record<IncidentStatus, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  NEW:         { label: 'New',         color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-white/5',     border: 'border-slate-300 dark:border-white/20', dot: 'bg-slate-500' },
  TRIAGED:     { label: 'Triaged',     color: 'text-sky-700 dark:text-sky-400',     bg: 'bg-sky-100/60 dark:bg-sky-500/10', border: 'border-sky-300 dark:border-sky-500/30', dot: 'bg-sky-500' },
  ASSIGNED:    { label: 'Assigned',    color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100/60 dark:bg-violet-500/10', border: 'border-violet-300 dark:border-violet-500/30', dot: 'bg-violet-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100/60 dark:bg-amber-500/10', border: 'border-amber-300 dark:border-amber-500/30', dot: 'bg-amber-500 animate-pulse' },
  ESCALATED:   { label: 'Escalated',  color: 'text-rose-700 dark:text-rose-400',   bg: 'bg-rose-100/60 dark:bg-rose-500/10', border: 'border-rose-300 dark:border-rose-500/30', dot: 'bg-rose-500 animate-pulse' },
  RESOLVED:    { label: 'Resolved',   color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100/60 dark:bg-emerald-500/10', border: 'border-emerald-300 dark:border-emerald-500/30', dot: 'bg-emerald-500' },
  CLOSED:      { label: 'Closed',     color: 'text-slate-500 dark:text-slate-500', bg: 'bg-slate-100 dark:bg-white/5', border: 'border-slate-200 dark:border-white/10', dot: 'bg-slate-400' },
};

export const INCIDENT_SEVERITY_CONFIG: Record<IncidentSeverity, {
  label: string; color: string; bg: string; border: string;
}> = {
  CRITICAL: { label: 'Critical', color: 'text-rose-700 dark:text-rose-400',    bg: 'bg-rose-100/70 dark:bg-rose-500/15',    border: 'border-rose-400 dark:border-rose-500/40' },
  HIGH:     { label: 'High',     color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100/70 dark:bg-orange-500/15', border: 'border-orange-400 dark:border-orange-500/40' },
  MEDIUM:   { label: 'Medium',   color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-100/70 dark:bg-amber-500/15',  border: 'border-amber-400 dark:border-amber-500/40' },
  LOW:      { label: 'Low',      color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100/70 dark:bg-emerald-500/15', border: 'border-emerald-400 dark:border-emerald-500/40' },
};

export const INCIDENT_TYPE_ICON: Record<IncidentType, string> = {
  FLOOD:                 '🌊',
  CYCLONE:               '🌀',
  ROAD_BLOCKAGE:         '🚧',
  SHELTER_OVERLOAD:      '⛺',
  RESOURCE_SHORTAGE:     '📦',
  MEDICAL_EMERGENCY:     '🚑',
  INFRASTRUCTURE_DAMAGE: '🏚️',
  CITIZEN_REPORT:        '📍',
  EVACUATION:            '🚶',
  LANDSLIDE:             '⛰️',
  FIRE:                  '🔥',
  MISSING_PERSON:        '🆘',
  OTHER:                 '⚠️',
};

export const TEAM_LABEL: Record<ResponseTeam, string> = {
  RESCUE:           'Rescue Team',
  MEDICAL:          'Medical Team',
  ROAD_CLEARANCE:   'Road Clearance',
  SHELTER_SUPPORT:  'Shelter Support',
  LOGISTICS:        'Logistics',
  FIELD_ASSESSMENT: 'Field Assessment',
  EMERGENCY_COORD:  'Emergency Coordination',
};

export const DATA_LABEL_CONFIG: Record<DataLabel, { label: string; color: string; bg: string }> = {
  SIMULATION:       { label: 'Simulated', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/15' },
  VERIFIED:         { label: 'Verified',         color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/15' },
  PREDICTED:        { label: 'Predicted',        color: 'text-sky-700 dark:text-sky-400',         bg: 'bg-sky-100 dark:bg-sky-500/15' },
  CITIZEN_REPORT:   { label: 'Citizen Report',   color: 'text-violet-700 dark:text-violet-400',   bg: 'bg-violet-100 dark:bg-violet-500/15' },
  HISTORICAL:       { label: 'Historical',       color: 'text-slate-700 dark:text-slate-400',     bg: 'bg-slate-100 dark:bg-white/5' },
  SYSTEM_GENERATED: { label: 'System Generated', color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-100 dark:bg-amber-500/15' },
  LIVE_UPDATED:     { label: 'Live Updated',     color: 'text-cyan-700 dark:text-cyan-400',       bg: 'bg-cyan-100 dark:bg-cyan-500/15' },
};
