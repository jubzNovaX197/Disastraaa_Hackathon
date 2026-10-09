/**
 * Cyclone Risk Engine — Types
 *
 * ⚠️  PROTOTYPE / DEMO THRESHOLDS ONLY.
 * These are NOT official government or scientific standards.
 */

// ── Raw environmental inputs ──────────────────────────────────────────────────

export interface CycloneRiskInputs {
  /** km/h — maximum sustained wind speed */
  windSpeedKmh: number;
  /** mm/24h — associated rainfall intensity */
  rainfallMmPerDay: number;
  /** metres — estimated storm surge height above normal sea level */
  stormSurgeMetres: number;
  /** km — distance from the cyclone track centre line */
  distanceFromTrackKm: number;
  /** estimated number of people in the zone */
  exposedPopulation: number;
  /** metres above mean sea level (inverse — lower = more vulnerable) */
  elevationMetres: number;
  /** 0–10 — historical cyclone events per decade affecting this zone */
  historicalCycloneFrequency: number;
  /** 0–1 — fraction of critical infrastructure at risk */
  infrastructureVulnerabilityIndex: number;
}

// ── Per-factor normalised scores (0–100) ─────────────────────────────────────

export interface CycloneFactorScores {
  windSpeed: number;
  rainfall: number;
  stormSurge: number;
  trackProximity: number;
  population: number;
  elevation: number;
  historicalFrequency: number;
  infrastructureVulnerability: number;
}

// ── Final result ──────────────────────────────────────────────────────────────

export type CycloneSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface CycloneRiskResult {
  /** 0–100 composite risk score (deterministic index, NOT uncalibrated probability) */
  score: number;
  severity: CycloneSeverity;
  /** Normalised 0–100 contribution of each factor */
  factors: CycloneFactorScores;
  /** Estimated affected population (provisional scenario proxy) */
  affectedPopulation: number;
  /** 0–1 — data completeness / model confidence */
  confidence: number;
  /** Data quality status based on input completeness & freshness */
  qualityStatus?: 'HIGH' | 'DEGRADED' | 'INSUFFICIENT';
  /** Provenance mode: measured physical telemetry vs scenario model */
  evaluationMode?: 'MEASURED_OBSERVATION' | 'SCENARIO_ESTIMATE';
  /** Deterministic model identifier */
  modelId?: string;
  /** Input validation or data limitation notes */
  notes?: string[];
  /** ISO-8601 timestamp of calculation */
  calculatedAt: string;
  /** true = live inputs; false = demo/simulated */
  isLive: boolean;
}

// ── Annotated result with human-readable explanation ─────────────────────────

export interface CycloneRiskExplanation {
  result: CycloneRiskResult;
  summary: string;
  driverNarrative: string;
  factorLabels: Record<keyof CycloneFactorScores, string>;
}
