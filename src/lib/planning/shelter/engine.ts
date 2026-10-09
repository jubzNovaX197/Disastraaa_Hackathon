/**
 * Shelter Requirement Planning Engine
 *
 * ⚠️  PROTOTYPE / DEMO — deterministic estimates only.
 * These are NOT official disaster-management or government standards.
 *
 * Replace with real evacuation models / optimization without changing the UI.
 */

import type { Severity } from '@/types';
import type {
  ShelterPlanningInputs,
  ShelterPlanningResult,
  ShelterPlanningStatus,
} from './types';

// ── Prototype assumptions ─────────────────────────────────────────────────────
// These are made explicit so the UI can display them as labelled assumptions.

/**
 * Fraction of affected population assumed to need emergency shelter.
 * Higher severity → more displacement.
 * These are illustrative fractions for demo purposes only.
 */
const BASE_EVACUATION_FRACTION: Record<Severity, number> = {
  LOW:      0.08,   // ~8% of affected pop need shelter
  MODERATE: 0.18,
  HIGH:     0.32,
  CRITICAL: 0.55,
};

/**
 * Severity multiplier applied on top of the base fraction
 * (adds a small boost to separate middle-bucket scores).
 */
const SEVERITY_MULTIPLIER: Record<Severity, number> = {
  LOW:      0.90,
  MODERATE: 1.00,
  HIGH:     1.10,
  CRITICAL: 1.20,
};

/** Default average shelter capacity used when estimating "additional shelters needed". */
const DEFAULT_AVG_SHELTER_CAPACITY = 500;

// ── Status thresholds ─────────────────────────────────────────────────────────

function deriveStatus(utilizationPct: number): ShelterPlanningStatus {
  if (utilizationPct >= 100) return 'SHORTAGE';
  if (utilizationPct >= 80)  return 'NEAR_CAPACITY';
  return 'SUFFICIENT';
}

// ── Recommendations ───────────────────────────────────────────────────────────

function buildRecommendations(
  status: ShelterPlanningStatus,
  gap: number,
  utilPct: number,
  additionalNeeded: number,
): string[] {
  const recs: string[] = [];

  if (status === 'SUFFICIENT') {
    recs.push('Existing shelter capacity appears sufficient for prototype demand estimate.');
    recs.push('Monitor occupancy as event develops and review when risk rises.');
  } else if (status === 'NEAR_CAPACITY') {
    recs.push('Existing shelters are approaching capacity — activate standby facilities.');
    recs.push('Prioritise shelters closest to high-risk zones for pre-positioning.');
    recs.push('Identify additional temporary shelter sites as contingency.');
  } else {
    recs.push(
      `Prototype model estimates a shortage of ~${gap.toLocaleString('en-IN')} shelter spaces.`,
    );
    recs.push(
      `Consider activating ~${additionalNeeded} additional shelter unit${additionalNeeded !== 1 ? 's' : ''} at average capacity.`,
    );
    recs.push('Prioritise shelter placement in highest-risk sub-zones.');
    recs.push('Coordinate with district administration for school / community hall activation.');
  }

  recs.push('⚠️ These are prototype planning recommendations only — not official guidance.');
  return recs;
}

// ── Historical adjustment ─────────────────────────────────────────────────────

/**
 * Compute a 0.8–1.3 multiplier based on historical average affected population
 * relative to current affected population estimate.
 * If history shows consistently larger impacts → push demand estimate up slightly.
 */
function historicalAdjustment(
  affectedPopulation: number,
  historicalAvg: number,
): number {
  if (historicalAvg <= 0) return 1.0;
  const ratio = historicalAvg / Math.max(affectedPopulation, 1);
  // Clamp: history 2× larger → 1.15; history 0.5× → 0.90
  return Math.min(Math.max(0.8 + ratio * 0.15, 0.85), 1.30);
}

// ── Historical note ────────────────────────────────────────────────────────────

function buildHistoricalNote(historicalAvg: number, adjustment: number): string {
  if (historicalAvg <= 0) {
    return 'No historical data available for this zone. Demand estimate uses current risk inputs only.';
  }
  const dir = adjustment >= 1.05 ? 'upward' : adjustment <= 0.95 ? 'downward' : 'minimal';
  return (
    `Historical average of ~${historicalAvg.toLocaleString('en-IN')} affected ` +
    `(demo data) applied a ${dir} adjustment (×${adjustment.toFixed(2)}) to shelter demand.`
  );
}

// ── Main engine ───────────────────────────────────────────────────────────────

export function calculateShelterRequirement(
  inputs: ShelterPlanningInputs,
): ShelterPlanningResult {
  const {
    zoneId,
    zoneName,
    affectedPopulation,
    severity,
    riskScore,
    historicalAvgAffectedPop,
    shelters,
  } = inputs;

  // ── Demand calculation ────────────────────────────────────────────────────
  const baseEvacFrac   = BASE_EVACUATION_FRACTION[severity];
  const severityMult   = SEVERITY_MULTIPLIER[severity];
  // Small risk-score micro-adjustment (same pattern as impact engine)
  const scoreMicro     = 0.90 + (riskScore / 100) * 0.20;
  const histAdj        = historicalAdjustment(affectedPopulation, historicalAvgAffectedPop);

  const rawDemand   = affectedPopulation * baseEvacFrac * severityMult * scoreMicro * histAdj;
  const finalDemand = Math.round(Math.max(rawDemand, 0));

  // ── Capacity aggregation ──────────────────────────────────────────────────
  const totalCapacity    = shelters.reduce((s, sh) => s + sh.capacity,       0);
  const occupiedCapacity = shelters.reduce((s, sh) => s + sh.occupancy,      0);
  const availableCapacity = shelters.reduce((s, sh) => s + sh.availableSlots, 0);

  const avgCap = shelters.length > 0
    ? Math.round(totalCapacity / shelters.length)
    : DEFAULT_AVG_SHELTER_CAPACITY;

  // ── Gap analysis ──────────────────────────────────────────────────────────
  const capacityGap    = finalDemand - availableCapacity;
  const utilizationPct = availableCapacity > 0
    ? Math.round((finalDemand / availableCapacity) * 100)
    : 999; // no capacity at all → critical shortage

  const additionalNeeded = capacityGap > 0
    ? Math.ceil(capacityGap / Math.max(avgCap, 1))
    : 0;

  // ── Status + recommendations ──────────────────────────────────────────────
  const status          = deriveStatus(utilizationPct);
  const recommendations = buildRecommendations(status, Math.max(capacityGap, 0), utilizationPct, additionalNeeded);

  // ── Assumptions list ──────────────────────────────────────────────────────
  const assumptions = [
    `Base evacuation fraction: ${Math.round(baseEvacFrac * 100)}% of affected population (${severity} severity).`,
    `Severity multiplier: ×${severityMult.toFixed(2)} (prototype scaling).`,
    `Risk score micro-adjustment: ×${scoreMicro.toFixed(2)} (score ${riskScore}/100).`,
    `Historical adjustment: ×${histAdj.toFixed(2)} based on demo historical data.`,
    `"Additional shelters needed" assumes avg ${avgCap.toLocaleString('en-IN')} capacity per shelter.`,
    '⚠️ All values are prototype demo estimates — not official standards.',
  ];

  const historicalNote = buildHistoricalNote(historicalAvgAffectedPop, histAdj);

  return {
    zoneId,
    zoneName,
    projectedDemand: finalDemand,
    demandBreakdown: {
      baseEvacuationFraction:  baseEvacFrac,
      historicalAdjustment:    histAdj,
      severityMultiplier:      severityMult,
      finalDemand,
    },
    totalCapacity,
    occupiedCapacity,
    availableCapacity,
    shelterItems:             shelters,
    capacityGap:              Math.max(capacityGap, 0),
    utilizationPct,
    additionalSheltersNeeded: additionalNeeded,
    avgShelterCapacity:       avgCap,
    status,
    recommendations,
    assumptions,
    historicalNote,
    calculatedAt: new Date().toISOString(),
  };
}
