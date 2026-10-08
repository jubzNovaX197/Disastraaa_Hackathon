/**
 * Cyclone Risk Engine — Core Calculation
 *
 * ⚠️  PROTOTYPE / DEMO calculation only.
 *     Do NOT cite these scores as official risk assessments.
 *
 * Design:
 *  - Pure function: same inputs → same output (deterministic)
 *  - No MapLibre / React / browser dependencies
 *  - Each raw input is normalised to 0–100 via a monotonic transfer function
 *  - Weighted sum produces the composite score
 *
 * Future-ready:
 *  Replace CycloneRiskInputs values with live IMD/RSMC data;
 *  this function and all UI need zero changes.
 */

import type {
  CycloneRiskInputs,
  CycloneFactorScores,
  CycloneRiskResult,
  CycloneSeverity,
} from './types';
import { CYCLONE_WEIGHTS } from './weights';

// ── Normalisation helpers ─────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function linearNorm(v: number, inMin: number, inMax: number): number {
  return clamp(((v - inMin) / (inMax - inMin)) * 100, 0, 100);
}

/**
 * Normalise raw inputs to 0–100 factor scores.
 * Higher score = more risk contribution.
 *
 * All transfer functions are piecewise-linear so the model is fully
 * transparent and auditable without a statistics background.
 */
function normaliseFactors(inputs: CycloneRiskInputs): CycloneFactorScores {
  // Wind speed: Saffir-Simpson inspired — 63 km/h (tropical storm threshold) → 0;
  // 250+ km/h (extreme severe) → 100
  const windSpeed = linearNorm(inputs.windSpeedKmh, 63, 250);

  // Rainfall: 0 mm/day → 0; 400+ mm/day → 100 (cyclonic extreme)
  const rainfall = linearNorm(inputs.rainfallMmPerDay, 0, 400);

  // Storm surge: 0 m → 0; 6+ m → 100 (catastrophic inundation threshold)
  const stormSurge = linearNorm(inputs.stormSurgeMetres, 0, 6);

  // Track proximity: inverse — 0 km (on track) = 100; 200+ km = 0
  const trackProximity = clamp(100 - linearNorm(inputs.distanceFromTrackKm, 0, 200), 0, 100);

  // Population exposure: 0 → 0; 1 000 000+ → 100
  const population = linearNorm(inputs.exposedPopulation, 0, 1_000_000);

  // Elevation: inverse — 0 m MSL = 100 risk; 30+ m = 0 risk (coastal focus)
  const elevation = clamp(100 - linearNorm(inputs.elevationMetres, 0, 30), 0, 100);

  // Historical frequency: 0 events/decade → 0; 10+ → 100
  const historicalFrequency = linearNorm(inputs.historicalCycloneFrequency, 0, 10);

  // Infrastructure vulnerability: already 0–1, scale to 0–100
  const infrastructureVulnerability = clamp(
    inputs.infrastructureVulnerabilityIndex * 100,
    0,
    100,
  );

  return {
    windSpeed,
    rainfall,
    stormSurge,
    trackProximity,
    population,
    elevation,
    historicalFrequency,
    infrastructureVulnerability,
  };
}

function weightedScore(factors: CycloneFactorScores): number {
  const sum = (Object.keys(CYCLONE_WEIGHTS) as (keyof CycloneFactorScores)[]).reduce(
    (acc, key) => acc + factors[key] * CYCLONE_WEIGHTS[key],
    0,
  );
  return Math.round(clamp(sum, 0, 100));
}

function toSeverity(score: number): CycloneSeverity {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

function estimateAffectedPopulation(population: number, score: number): number {
  return Math.round(population * clamp(score / 100, 0, 1));
}

function calcConfidence(inputs: CycloneRiskInputs): number {
  const fields: number[] = [
    inputs.windSpeedKmh,
    inputs.rainfallMmPerDay,
    inputs.stormSurgeMetres,
    inputs.distanceFromTrackKm,
    inputs.exposedPopulation,
    inputs.elevationMetres,
    inputs.historicalCycloneFrequency,
    inputs.infrastructureVulnerabilityIndex,
  ];
  const populated = fields.filter((f) => f >= 0).length;
  return Math.round((populated / fields.length) * 100) / 100;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calculate cyclone risk from environmental + geographic inputs.
 *
 * @param inputs  Raw sensor / modelled environmental values
 * @param isLive  true if inputs come from real-time sources
 * @returns       Typed CycloneRiskResult — deterministic for same inputs
 */
export function calculateCycloneRisk(
  inputs: CycloneRiskInputs,
  isLive = false,
): CycloneRiskResult {
  const factors            = normaliseFactors(inputs);
  const score              = weightedScore(factors);
  const severity           = toSeverity(score);
  const affectedPopulation = estimateAffectedPopulation(inputs.exposedPopulation, score);
  const confidence         = calcConfidence(inputs);

  return {
    score,
    severity,
    factors,
    affectedPopulation,
    confidence,
    calculatedAt: new Date().toISOString(),
    isLive,
  };
}
