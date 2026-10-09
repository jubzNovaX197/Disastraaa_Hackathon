/**
 * Multi-Hazard Risk Engine — Composite Calculation
 *
 * ⚠️  PROTOTYPE / DEMO calculation only.
 *     Do NOT cite these scores as official risk assessments.
 *
 * Design:
 *  - Pure function — deterministic for same inputs.
 *  - Consumes pre-computed per-hazard results; never re-runs engines.
 *  - Normalises weights so the set of active hazards always sums to 1.
 *  - Extensible: accepts any HazardContribution entries.
 */

import type { CycloneRiskExplanation } from '@/lib/risk/cyclone';
import type { FloodRiskExplanation } from '@/lib/risk/flood';
import type { HazardType, Severity } from '@/types';
import type {
  DataQuality,
  HazardContribution,
  MultiHazardRiskResult,
} from './types';
import { MULTI_HAZARD_WEIGHTS } from './weights';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function toSeverity(score: number): Severity {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

function dataQuality(avgConfidence: number, hazardCount: number): DataQuality {
  if (avgConfidence >= 0.8 && hazardCount >= 2) return 'GOOD';
  if (avgConfidence >= 0.5 || hazardCount >= 2) return 'PARTIAL';
  return 'LIMITED';
}

// ── Input adapters ────────────────────────────────────────────────────────────

function fromFlood(ex: FloodRiskExplanation): HazardContribution {
  const raw = MULTI_HAZARD_WEIGHTS['FLOOD'] ?? 0.85;
  return {
    hazard:          'FLOOD',
    score:           ex.result.score,
    severity:        ex.result.severity,
    weight:          raw,
    weightedScore:   0, // filled after normalisation
    driverNarrative: ex.driverNarrative,
    confidence:      ex.result.confidence,
  };
}

function fromCyclone(ex: CycloneRiskExplanation): HazardContribution {
  const raw = MULTI_HAZARD_WEIGHTS['CYCLONE'] ?? 1.0;
  return {
    hazard:          'CYCLONE',
    score:           ex.result.score,
    severity:        ex.result.severity,
    weight:          raw,
    weightedScore:   0,
    driverNarrative: ex.driverNarrative,
    confidence:      ex.result.confidence,
  };
}

// ── Core calculation ──────────────────────────────────────────────────────────

function computeComposite(contributions: HazardContribution[]): {
  contributions: HazardContribution[];
  score: number;
  dominantHazard: HazardType;
} {
  const totalWeight = contributions.reduce((s, c) => s + c.weight, 0);

  const filled = contributions.map((c) => ({
    ...c,
    weight:        c.weight / totalWeight,
    weightedScore: (c.score * c.weight) / totalWeight,
  }));

  const score = Math.round(
    clamp(filled.reduce((s, c) => s + c.weightedScore, 0), 0, 100),
  );

  const dominant = filled.reduce(
    (best, c) => (c.weightedScore > best.weightedScore ? c : best),
    filled[0],
  );

  const sorted = [...filled].sort((a, b) => b.weightedScore - a.weightedScore);

  return { contributions: sorted, score, dominantHazard: dominant.hazard };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface MultiHazardInputs {
  flood?:   FloodRiskExplanation;
  cyclone?: CycloneRiskExplanation;
  /** Max population across all hazard zones for this location */
  affectedPopulation: number;
}

/**
 * Combine per-hazard explanation objects into a composite risk result.
 * At least one hazard must be provided.
 */
export function calculateMultiHazardRisk(
  inputs: MultiHazardInputs,
): MultiHazardRiskResult {
  const raw: HazardContribution[] = [];
  if (inputs.flood)   raw.push(fromFlood(inputs.flood));
  if (inputs.cyclone) raw.push(fromCyclone(inputs.cyclone));

  if (raw.length === 0) {
    throw new Error('[MultiHazardEngine] At least one hazard explanation required.');
  }

  const { contributions, score, dominantHazard } = computeComposite(raw);
  const severity = toSeverity(score);

  const avgConfidence =
    contributions.reduce((s, c) => s + c.confidence, 0) / contributions.length;

  const rawPop = typeof inputs.affectedPopulation === 'number' && !isNaN(inputs.affectedPopulation)
    ? Math.max(0, inputs.affectedPopulation)
    : 0;

  return {
    score,
    severity,
    dominantHazard,
    contributions,
    affectedPopulation: rawPop,
    dataQuality:        dataQuality(avgConfidence, contributions.length),
    calculatedAt:       new Date().toISOString(),
  };
}
