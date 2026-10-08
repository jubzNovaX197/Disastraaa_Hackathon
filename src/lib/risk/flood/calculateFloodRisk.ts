/**
 * Flood Risk Engine — Core Calculation
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
 *  Replace FloodRiskInputs values with live sensor / API data;
 *  this function and all UI need zero changes.
 */

import type { FloodRiskInputs, FloodFactorScores, FloodRiskResult, FloodSeverity } from './types';
import { FLOOD_WEIGHTS } from './weights';

// ── Normalisation helpers ─────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Map value linearly from [inMin, inMax] → [0, 100] */
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
function normaliseFactors(inputs: FloodRiskInputs): FloodFactorScores {
  // Rainfall: 0 mm/day → 0 risk; 300+ mm/day → 100 risk
  const rainfall = linearNorm(inputs.rainfallIntensityMmPerDay, 0, 300);

  // River level: 0 m above flood stage → 0; 5+ m → 100
  const riverLevel = linearNorm(inputs.riverLevelMetres, 0, 5);

  // Elevation: inverse — higher ground = lower risk
  // 0 m MSL = 100 risk; 50+ m MSL = 0 risk
  const elevation = clamp(100 - linearNorm(inputs.elevationMetres, 0, 50), 0, 100);

  // Distance from river: inverse — closer = higher risk
  // 0 km = 100; 10+ km = 0
  const distanceFromRiver = clamp(100 - linearNorm(inputs.distanceFromRiverKm, 0, 10), 0, 100);

  // Population exposure proxy: 0 → 0; 1 000 000+ → 100
  const population = linearNorm(inputs.exposedPopulation, 0, 1_000_000);

  // Historical frequency: 0 events/decade → 0; 10+ → 100
  const historicalFrequency = linearNorm(inputs.historicalFloodFrequency, 0, 10);

  // Infrastructure vulnerability: already 0–1, scale to 0–100
  const infrastructureVulnerability = clamp(
    inputs.infrastructureVulnerabilityIndex * 100,
    0,
    100,
  );

  return {
    rainfall,
    riverLevel,
    elevation,
    distanceFromRiver,
    population,
    historicalFrequency,
    infrastructureVulnerability,
  };
}

function weightedScore(factors: FloodFactorScores): number {
  const sum = (Object.keys(FLOOD_WEIGHTS) as (keyof FloodFactorScores)[]).reduce(
    (acc, key) => acc + factors[key] * FLOOD_WEIGHTS[key],
    0,
  );
  return Math.round(clamp(sum, 0, 100));
}

function toSeverity(score: number): FloodSeverity {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

/**
 * Estimate affected population: linear proxy from composite score.
 * Not a real epidemiological model.
 */
function estimateAffectedPopulation(population: number, score: number): number {
  return Math.round(population * clamp(score / 100, 0, 1));
}

/** Confidence: data-completeness heuristic (all inputs >= 0 = full confidence) */
function calcConfidence(inputs: FloodRiskInputs): number {
  const fields: number[] = [
    inputs.rainfallIntensityMmPerDay,
    inputs.riverLevelMetres,
    inputs.elevationMetres,
    inputs.distanceFromRiverKm,
    inputs.exposedPopulation,
    inputs.historicalFloodFrequency,
    inputs.infrastructureVulnerabilityIndex,
  ];
  const populated = fields.filter((f) => f >= 0).length;
  return Math.round((populated / fields.length) * 100) / 100;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calculate flood risk from environmental + geographic inputs.
 *
 * @param inputs  Raw sensor / modelled environmental values
 * @param isLive  true if inputs come from real-time sources
 * @returns       Typed FloodRiskResult — deterministic for same inputs
 */
export function calculateFloodRisk(
  inputs: FloodRiskInputs,
  isLive = false,
): FloodRiskResult {
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
