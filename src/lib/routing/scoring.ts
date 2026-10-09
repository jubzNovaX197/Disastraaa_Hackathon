/**
 * Route Scoring — edge cost functions
 *
 * All weights are centralised here. Swap or tune without touching the engine.
 * ⚠️  PROTOTYPE weights — not official disaster-management standards.
 */

import type { Severity } from '@/types';
import type { RouteEdge } from './types';

// ── Base speeds by road type (km/h) ──────────────────────────────────────────

export const BASE_SPEED_KMH: Record<RouteEdge['roadType'], number> = {
  HIGHWAY:       80,
  MAJOR_ROAD:    55,
  DISTRICT_ROAD: 40,
  LOCAL_ROAD:    30,
  VILLAGE_ROAD:  20,
};

// ── Speed penalty multipliers by status ──────────────────────────────────────
// Result: effective_speed = base * multiplier

export const SPEED_MULTIPLIER: Record<RouteEdge['status'], number> = {
  OPEN:              1.00,
  CAUTION:           0.65,
  PARTIALLY_BLOCKED: 0.35,
  BLOCKED:           0.10,  // should never be used in SAFEST mode
  CLOSED:            0.05,  // same
  UNKNOWN:           0.80,
};

// ── SHORTEST mode: pure distance edge cost ────────────────────────────────────

export function shortestCost(edge: RouteEdge): number {
  // Completely impassable — very large penalty but not Infinity so A* can find something
  if (edge.status === 'CLOSED' || edge.status === 'BLOCKED') {
    return edge.distanceKm * 50;
  }
  return edge.distanceKm;
}

// ── SAFEST mode: risk-weighted edge cost ──────────────────────────────────────

/**
 * Centralised safety cost weights.
 * distance_weight: how much raw km contributes
 * risk_weight: how much the 0–100 risk score contributes
 * blockage_penalty: flat addition for BLOCKED/CLOSED (makes them very unattractive)
 * partial_penalty: flat addition for PARTIALLY_BLOCKED
 * caution_penalty: flat addition for CAUTION
 * unknown_penalty: flat addition for UNKNOWN
 */
export const SAFETY_WEIGHTS = {
  distance_weight:  1.0,
  risk_weight:      0.15,   // riskScore (0–100) → adds 0–15 to cost
  blockage_penalty: 999.0,  // effectively excludes BLOCKED/CLOSED
  partial_penalty:  8.0,
  caution_penalty:  3.0,
  unknown_penalty:  2.0,
} as const;

export function safestCost(edge: RouteEdge): number {
  // Exclude blocked/closed
  if (edge.status === 'CLOSED' || edge.status === 'BLOCKED') {
    return edge.distanceKm + SAFETY_WEIGHTS.blockage_penalty;
  }

  let cost = edge.distanceKm * SAFETY_WEIGHTS.distance_weight;
  cost += (edge.riskScore / 100) * edge.distanceKm * SAFETY_WEIGHTS.risk_weight * 100;

  switch (edge.status) {
    case 'PARTIALLY_BLOCKED': cost += SAFETY_WEIGHTS.partial_penalty;  break;
    case 'CAUTION':           cost += SAFETY_WEIGHTS.caution_penalty;   break;
    case 'UNKNOWN':           cost += SAFETY_WEIGHTS.unknown_penalty;   break;
    default: break;
  }

  return cost;
}

// ── ALTERNATIVE mode: penalise the safest path's nodes to force a different route ──

/**
 * Alternative route cost: same as safest, but edges used in the safest
 * route receive a large detour penalty so A* routes around them.
 */
export function alternativeCost(edge: RouteEdge, usedEdgeIds: Set<string>): number {
  const base = safestCost(edge);
  if (usedEdgeIds.has(edge.id) || usedEdgeIds.has(`${edge.id}-rev`)) {
    return base + 25; // significant detour nudge
  }
  return base;
}

// ── Travel time estimate ──────────────────────────────────────────────────────

export function estimateTravelMinutes(edge: RouteEdge): number {
  const baseSpeed = BASE_SPEED_KMH[edge.roadType];
  const effSpeed  = baseSpeed * SPEED_MULTIPLIER[edge.status];
  const clampedSpeed = Math.max(effSpeed, 5); // never below 5 km/h
  return (edge.distanceKm / clampedSpeed) * 60;
}

// ── Route-level risk aggregation ──────────────────────────────────────────────

export function aggregateRouteRisk(riskScores: number[]): {
  score: number;
  severity: Severity;
} {
  if (riskScores.length === 0) return { score: 0, severity: 'LOW' };

  // Weight: 60% max, 40% average — surfaces worst-case segment prominently
  const max = Math.max(...riskScores);
  const avg = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
  const score = Math.round(max * 0.6 + avg * 0.4);

  let severity: Severity;
  if (score >= 75) severity = 'CRITICAL';
  else if (score >= 50) severity = 'HIGH';
  else if (score >= 25) severity = 'MODERATE';
  else severity = 'LOW';

  return { score, severity };
}

// ── Segment risk severity ─────────────────────────────────────────────────────

export function segmentRiskSeverity(score: number): Severity {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}
