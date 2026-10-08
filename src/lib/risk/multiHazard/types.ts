/**
 * Multi-Hazard Risk Engine — Types
 *
 * ⚠️  PROTOTYPE / DEMO ONLY.
 * Not official government or scientific standards.
 *
 * Architecture:
 *  - Consumes pre-computed per-hazard results (flood, cyclone, …).
 *  - Never re-runs individual risk engines.
 *  - Extensible: add a new HazardContribution entry when a new engine ships.
 */

import type { HazardType, Severity } from '@/types';

// ── Per-hazard contribution ───────────────────────────────────────────────────

export interface HazardContribution {
  /** Hazard identifier — matches HazardType union */
  hazard: HazardType;
  /** 0–100 score from the individual risk engine */
  score: number;
  /** Severity bucket of the individual score */
  severity: Severity;
  /** 0–1 weight applied in the composite calculation */
  weight: number;
  /** Weighted contribution to the composite score (score × weight) */
  weightedScore: number;
  /** Top driver narrative from the individual engine */
  driverNarrative: string;
  /** 0–1 data confidence from the individual engine */
  confidence: number;
}

// ── Composite result ──────────────────────────────────────────────────────────

export type DataQuality = 'GOOD' | 'PARTIAL' | 'LIMITED';

export interface MultiHazardRiskResult {
  /** 0–100 composite score across all active hazards */
  score: number;
  severity: Severity;
  /** Hazard that contributes most to the composite score */
  dominantHazard: HazardType;
  /** Per-hazard breakdown, sorted by weightedScore descending */
  contributions: HazardContribution[];
  /** Total affected population (max of individual estimates) */
  affectedPopulation: number;
  /** Prototype data-quality indicator */
  dataQuality: DataQuality;
  /** ISO-8601 */
  calculatedAt: string;
}

// ── Explanation ───────────────────────────────────────────────────────────────

export interface MultiHazardRiskExplanation {
  result: MultiHazardRiskResult;
  /** One-sentence overall summary */
  overallSummary: string;
  /** Narrative describing dominant hazard and main drivers */
  dominantNarrative: string;
  /** Per-hazard short summaries */
  hazardSummaries: Record<string, string>;
}
