/**
 * MapLibre layer style expressions.
 *
 * All paint/layout expressions are defined here so that individual
 * addLayer helpers stay readable and styling can be tuned in one place.
 */

import type { ExpressionSpecification } from 'maplibre-gl';

// ── Severity colour expressions ───────────────────────────────────────────────

/** Returns a MapLibre match expression mapping severity → hex colour */
export function severityColorExpr(
  field: string = 'severity',
): ExpressionSpecification {
  return [
    'match',
    ['get', field],
    'LOW',      '#10B981', // safe green
    'MODERATE', '#F59E0B', // amber
    'HIGH',     '#F97316', // orange
    'CRITICAL', '#EF4444', // red
    '#64748B',             // fallback slate
  ];
}

/** Returns a match expression for opacity by severity */
export function severityOpacityExpr(
  baseOpacity: number,
  field: string = 'severity',
): ExpressionSpecification {
  return [
    'match',
    ['get', field],
    'LOW',      baseOpacity * 0.55,
    'MODERATE', baseOpacity * 0.65,
    'HIGH',     baseOpacity * 0.80,
    'CRITICAL', baseOpacity,
    baseOpacity * 0.5,
  ];
}

// ── Shelter status colours ────────────────────────────────────────────────────

export function shelterStatusColorExpr(): ExpressionSpecification {
  return [
    'match',
    ['get', 'status'],
    'OPEN',      '#10B981',
    'FULL',      '#F59E0B',
    'CLOSED',    '#EF4444',
    'PREPARING', '#3B82F6',
    '#64748B',
  ];
}

// ── Infrastructure type colours ───────────────────────────────────────────────

export function infraColorExpr(): ExpressionSpecification {
  return [
    'match',
    ['get', 'type'],
    'HOSPITAL',                     '#EF4444',
    'FIRE_STATION',                 '#F97316',
    'POLICE_STATION',               '#3B82F6',
    'EMERGENCY_OPERATIONS_CENTER',  '#22D3EE',
    'HELIPAD',                      '#8B5CF6',
    'WATER_SUPPLY',                 '#06B6D4',
    '#64748B',
  ];
}

// ── Road network & status colours (Task 12) ──────────────────────────────────

export function roadStatusColorExpr(): ExpressionSpecification {
  return [
    'case',
    ['has', 'status'],
    [
      'match',
      ['get', 'status'],
      'OPEN',              '#10B981', // Emerald / Passable
      'CAUTION',           '#F59E0B', // Amber / Hazard Caution
      'PARTIALLY_BLOCKED', '#F97316', // Orange / Bottleneck
      'BLOCKED',           '#EF4444', // Red / Impassable
      'CLOSED',            '#DC2626', // Crimson / Official Barricade
      'UNKNOWN',           '#64748B', // Slate / Unconfirmed
      '#94A3B8',
    ],
    // Fallback for legacy BlockedRoad severity
    [
      'match',
      ['get', 'severity'],
      'FULL',    '#EF4444',
      'PARTIAL', '#F97316',
      '#F59E0B',
    ],
  ];
}

export const blockedRoadColorExpr = roadStatusColorExpr;

// ── Citizen report colours ────────────────────────────────────────────────────

export function reportStatusColorExpr(): ExpressionSpecification {
  return [
    'match',
    ['get', 'status'],
    'VERIFIED',             '#10B981',
    'COMMUNITY_CONFIRMED',  '#F59E0B',
    'UNDER_REVIEW',        '#38BDF8',
    'ESCALATED',           '#EF4444',
    'REJECTED',            '#64748B',
    'PENDING',              '#94A3B8',
    '#94A3B8',
  ];
}
