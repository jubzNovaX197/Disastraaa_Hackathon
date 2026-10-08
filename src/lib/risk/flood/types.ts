/**
 * Flood Risk Engine — Types
 *
 * ⚠️  PROTOTYPE / DEMO THRESHOLDS ONLY.
 * These are not official government or scientific standards.
 */

// ── Raw environmental inputs ──────────────────────────────────────────────────

export interface FloodRiskInputs {
  /** mm/24h — recent rainfall intensity */
  rainfallIntensityMmPerDay: number;
  /** metres above flood stage (negative = below flood stage) */
  riverLevelMetres: number;
  /** metres above mean sea level */
  elevationMetres: number;
  /** km from nearest river / water body */
  distanceFromRiverKm: number;
  /** estimated number of people in the zone */
  exposedPopulation: number;
  /** 0–10: historical flood events per decade */
  historicalFloodFrequency: number;
  /** 0–1: fraction of critical infra at risk (hospitals, roads, power) */
  infrastructureVulnerabilityIndex: number;
}

// ── Per-factor normalised scores (0–100) ─────────────────────────────────────

export interface FloodFactorScores {
  rainfall: number;
  riverLevel: number;
  elevation: number;
  distanceFromRiver: number;
  population: number;
  historicalFrequency: number;
  infrastructureVulnerability: number;
}

// ── Final result ──────────────────────────────────────────────────────────────

export type FloodSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface FloodRiskResult {
  /** 0–100 composite risk score */
  score: number;
  severity: FloodSeverity;
  /** Normalised 0–100 contribution of each factor */
  factors: FloodFactorScores;
  /** Estimated affected population */
  affectedPopulation: number;
  /** 0–1 — data completeness / model confidence */
  confidence: number;
  /** ISO-8601 timestamp of calculation */
  calculatedAt: string;
  /** True = uses real-time inputs; false = demo/simulated */
  isLive: boolean;
}

// ── Annotated result with human-readable explanation ─────────────────────────

export interface FloodRiskExplanation {
  result: FloodRiskResult;
  summary: string;
  driverNarrative: string;
  factorLabels: Record<keyof FloodFactorScores, string>;
}
