/**
 * Citizen Disaster Reporting & Ground Intelligence — Rules & Workflow Logic
 *
 * ⚠️  PROTOTYPE / DEMO WORKFLOW RULES
 *
 * Deterministic rules governing:
 * 1. Preliminary automated scoring
 * 2. Community confirmation thresholds
 * 3. Authority verification guards (citizens can NEVER officially verify)
 * 4. Status transitions
 */

import type { HazardType, Severity, ReportStatus } from '@/types';
import type {
  BlockageType,
  PreliminaryConfidence,
  ReportType,
} from './types';

// ── Hazard Type Resolution ───────────────────────────────────────────────────

export const REPORT_TO_HAZARD_MAP: Record<ReportType, HazardType> = {
  FLOOD:                 'FLOOD',
  WATER_LEVEL:           'FLOOD',
  CYCLONE:               'CYCLONE',
  BLOCKED_ROAD:          'FLOOD',
  DAMAGED_ROAD:          'FLOOD',
  DAMAGED_BUILDING:      'CYCLONE',
  INFRASTRUCTURE_DAMAGE: 'CYCLONE',
  FIRE:                  'HEATWAVE',
  MEDICAL_EMERGENCY:     'FLOOD',
  MISSING_PERSON:        'FLOOD',
  SHELTER_ISSUE:         'CYCLONE',
  POWER_OUTAGE:          'CYCLONE',
  LANDSLIDE:             'LANDSLIDE',
  OTHER:                 'FLOOD',
};

// ── Report Type Metadata ─────────────────────────────────────────────────────

export const REPORT_TYPE_CONFIG: Record<
  ReportType,
  { label: string; icon: string; description: string; defaultSeverity: Severity }
> = {
  FLOOD: {
    label: 'Flooding & Inundation',
    icon: '🌊',
    description: 'Water entering streets, homes, or fields',
    defaultSeverity: 'HIGH',
  },
  BLOCKED_ROAD: {
    label: 'Blocked Road / Pass',
    icon: '🚧',
    description: 'Road impassable due to water, tree, or landslide',
    defaultSeverity: 'HIGH',
  },
  LANDSLIDE: {
    label: 'Landslide / Rockfall',
    icon: '⛰️',
    description: 'Soil erosion, sliding debris on hillside roads',
    defaultSeverity: 'HIGH',
  },
  FIRE: {
    label: 'Fire Emergency',
    icon: '🔥',
    description: 'Active urban fire, wildfire, or severe smoke outbreak',
    defaultSeverity: 'CRITICAL',
  },
  CYCLONE: {
    label: 'Cyclone Damage & Wind',
    icon: '🌀',
    description: 'Extreme gusts, fallen structures, flying debris',
    defaultSeverity: 'CRITICAL',
  },
  INFRASTRUCTURE_DAMAGE: {
    label: 'Infrastructure Damage',
    icon: '🏚️',
    description: 'Bridge collapse, transformer down, or structural damage',
    defaultSeverity: 'HIGH',
  },
  MEDICAL_EMERGENCY: {
    label: 'Medical Emergency',
    icon: '🚑',
    description: 'Stranded injured persons, dialysis/oxygen rescue needs',
    defaultSeverity: 'CRITICAL',
  },
  MISSING_PERSON: {
    label: 'Missing / Stranded Person',
    icon: '🆘',
    description: 'Individuals trapped by floodwaters, lost, or needing rescue',
    defaultSeverity: 'CRITICAL',
  },
  WATER_LEVEL: {
    label: 'Rising Water Level',
    icon: '📏',
    description: 'River, canal, or reservoir water level surge',
    defaultSeverity: 'MODERATE',
  },
  DAMAGED_ROAD: {
    label: 'Damaged Bridge / Road',
    icon: '⚠️',
    description: 'Cracked pavement, washed-away culvert, shaky bridge',
    defaultSeverity: 'HIGH',
  },
  DAMAGED_BUILDING: {
    label: 'Building Collapse',
    icon: '🏢',
    description: 'House collapse, roof blown off, school damage',
    defaultSeverity: 'HIGH',
  },
  SHELTER_ISSUE: {
    label: 'Shelter Overcrowding / Need',
    icon: '⛺',
    description: 'Shelter capacity full, no drinking water or food',
    defaultSeverity: 'MODERATE',
  },
  POWER_OUTAGE: {
    label: 'Power Grid / Transformer Down',
    icon: '⚡',
    description: 'Uprooted electrical poles, fallen live cables',
    defaultSeverity: 'MODERATE',
  },
  OTHER: {
    label: 'Other Incident',
    icon: '📍',
    description: 'Ground hazards not matching standard categories',
    defaultSeverity: 'MODERATE',
  },
};

// ── Blockage Type Metadata ───────────────────────────────────────────────────

export const BLOCKAGE_CONFIG: Record<
  BlockageType,
  { label: string; icon: string }
> = {
  FLOODING:         { label: 'Submerged Under Water',  icon: '🌊' },
  DEBRIS:           { label: 'Fallen Trees & Debris',  icon: '🪵' },
  LANDSLIDE:        { label: 'Landslide / Rockfall',    icon: '⛰️' },
  COLLAPSED_ROAD:   { label: 'Bridge / Road Collapse', icon: '💥' },
  VEHICLE_ACCIDENT: { label: 'Stuck Heavy Vehicles',   icon: '🚛' },
  UNKNOWN:          { label: 'Obstruction (Unspecified)', icon: '🚧' },
};

// ── Status Display Configurations ─────────────────────────────────────────────

export const REPORT_STATUS_CONFIG: Record<
  ReportStatus,
  {
    label: string;
    icon: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    description: string;
  }
> = {
  PENDING: {
    label: 'Pending Review',
    icon: '⏳',
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    description: 'Submitted by citizen. Awaiting automated analysis and community feedback.',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    icon: '🔍',
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400',
    description: 'Preliminary analysis generated. Awaiting community corroboration or authority triage.',
  },
  COMMUNITY_CONFIRMED: {
    label: 'Community Confirmed',
    icon: '👥',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    description: 'Multiple nearby citizens have corroborated this hazard report.',
  },
  VERIFIED: {
    label: 'Authority Verified',
    icon: '✓',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    description: 'Officially confirmed and verified by disaster management authorities.',
  },
  REJECTED: {
    label: 'Rejected / Discarded',
    icon: '✕',
    bg: 'bg-slate-600/10 dark:bg-slate-600/15',
    text: 'text-slate-500 dark:text-slate-400 line-through',
    border: 'border-slate-600/30',
    dot: 'bg-slate-500',
    description: 'Discarded by authority due to duplicate, false rumor, or insufficient evidence.',
  },
  ESCALATED: {
    label: 'Escalated / High Priority',
    icon: '🚨',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400 font-bold',
    border: 'border-rose-500/40',
    dot: 'bg-rose-500',
    description: 'Flagged for immediate priority dispatch or life-safety intervention.',
  },
};

// ── Confidence Display Configuration ──────────────────────────────────────────

export const CONFIDENCE_CONFIG: Record<
  PreliminaryConfidence,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  LOW_CONFIDENCE: {
    label: 'Low Preliminary Confidence',
    icon: '○',
    bg: 'bg-slate-500/10',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
  MEDIUM_CONFIDENCE: {
    label: 'Medium Preliminary Confidence',
    icon: '◔',
    bg: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/30',
  },
  HIGH_CONFIDENCE: {
    label: 'High Preliminary Confidence',
    icon: '◕',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  URGENT: {
    label: 'Urgent Priority Warning',
    icon: '●',
    bg: 'bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/40',
  },
};

// ── Thresholds & Constants ───────────────────────────────────────────────────

export const WORKFLOW_CONSTANTS = {
  COMMUNITY_CONFIRM_THRESHOLD: 3,
  COMMUNITY_SUSPICIOUS_THRESHOLD: 3,
  MAX_NEARBY_KM: 25,
  ALERT_TRIGGER_DISTANCE_KM: 15,
} as const;

// ── Workflow Permission Validation ───────────────────────────────────────────

/**
 * Validates whether an action can legally transition a report's status.
 *
 * CRITICAL RULE: A citizen CANNOT mark a report as VERIFIED or REJECTED.
 * Only authorities can do that.
 */
export function canTransitionStatus(
  currentStatus: ReportStatus,
  targetStatus: ReportStatus,
  isAuthority: boolean,
): { allowed: boolean; reason?: string } {
  // If user is not an authority, they cannot verify or reject
  if (!isAuthority) {
    if (targetStatus === 'VERIFIED' || targetStatus === 'REJECTED') {
      return {
        allowed: false,
        reason: 'Authority credentials required to officially verify or reject citizen reports.',
      };
    }
  }

  // Once rejected, cannot be confirmed by community
  if (currentStatus === 'REJECTED' && targetStatus === 'COMMUNITY_CONFIRMED') {
    return {
      allowed: false,
      reason: 'Rejected reports cannot be revived by community confirmations alone.',
    };
  }

  return { allowed: true };
}
