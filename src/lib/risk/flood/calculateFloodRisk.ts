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

import type { FloodFactorScores, FloodRiskInputs, FloodRiskResult, FloodSeverity } from './types';
import { FLOOD_WEIGHTS } from './weights';

// ── Normalisation helpers ─────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Map value linearly from [inMin, inMax] → [0, 100] */
function linearNorm(v: number, inMin: number, inMax: number): number {
  return clamp(((v - inMin) / (inMax - inMin)) * 100, 0, 100);
}

/** Validates if a value is a valid, finite number */
function isValidNum(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v) && isFinite(v);
}

/**
 * Normalise raw inputs to 0–100 factor scores.
 * Higher score = more risk contribution.
 *
 * All transfer functions are piecewise-linear so the model is fully
 * transparent and auditable without a statistics background.
 */
function normaliseFactors(inputs: FloodRiskInputs): FloodFactorScores {
  // Rainfall: 0 mm/day → 0 risk; 300+ mm/day → 100 risk. Default 0 if invalid
  const rawRain = isValidNum(inputs.rainfallIntensityMmPerDay) ? Math.max(0, inputs.rainfallIntensityMmPerDay) : 0;
  const rainfall = linearNorm(rawRain, 0, 300);

  // River level: 0 m above flood stage → 0; 5+ m → 100. Negative = below flood stage → 0
  const rawRiver = isValidNum(inputs.riverLevelMetres) ? Math.max(0, inputs.riverLevelMetres) : 0;
  const riverLevel = linearNorm(rawRiver, 0, 5);

  // Elevation: inverse — higher ground = lower risk
  // 0 m MSL = 100 risk; 50+ m MSL = 0 risk
  const rawElev = isValidNum(inputs.elevationMetres) ? inputs.elevationMetres : 25;
  const elevation = clamp(100 - linearNorm(rawElev, 0, 50), 0, 100);

  // Distance from river: inverse — closer = higher risk
  // 0 km = 100; 10+ km = 0
  const rawDist = isValidNum(inputs.distanceFromRiverKm) ? Math.max(0, inputs.distanceFromRiverKm) : 5;
  const distanceFromRiver = clamp(100 - linearNorm(rawDist, 0, 10), 0, 100);

  // Population exposure proxy: 0 → 0; 1 000 000+ → 100
  const rawPop = isValidNum(inputs.exposedPopulation) ? Math.max(0, inputs.exposedPopulation) : 0;
  const population = linearNorm(rawPop, 0, 1_000_000);

  // Historical frequency: 0 events/decade → 0; 10+ → 100
  const rawHist = isValidNum(inputs.historicalFloodFrequency) ? Math.max(0, inputs.historicalFloodFrequency) : 0;
  const historicalFrequency = linearNorm(rawHist, 0, 10);

  // Infrastructure vulnerability: already 0–1, scale to 0–100
  const rawVuln = isValidNum(inputs.infrastructureVulnerabilityIndex)
    ? clamp(inputs.infrastructureVulnerabilityIndex, 0, 1)
    : 0.3;
  const infrastructureVulnerability = clamp(rawVuln * 100, 0, 100);

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
 * Provisional scenario estimate — not a physical epidemiological model.
 */
function estimateAffectedPopulation(population: number, score: number): number {
  const pop = isValidNum(population) ? Math.max(0, population) : 0;
  return Math.round(pop * clamp(score / 100, 0, 1));
}

/**
 * Confidence calculation: checks valid domain for each input.
 * Note: Negative riverLevelMetres is a valid physical measurement (below flood stage).
 */
function evaluateInputIntegrity(inputs: FloodRiskInputs): {
  confidence: number;
  qualityStatus: 'HIGH' | 'DEGRADED' | 'INSUFFICIENT';
  notes: string[];
} {
  const notes: string[] = [];
  const checks = [
    { name: 'rainfall', valid: isValidNum(inputs.rainfallIntensityMmPerDay) && inputs.rainfallIntensityMmPerDay >= 0, critical: true },
    { name: 'riverLevel', valid: isValidNum(inputs.riverLevelMetres), critical: false }, // negative is valid
    { name: 'elevation', valid: isValidNum(inputs.elevationMetres), critical: false },
    { name: 'distanceFromRiver', valid: isValidNum(inputs.distanceFromRiverKm) && inputs.distanceFromRiverKm >= 0, critical: false },
    { name: 'population', valid: isValidNum(inputs.exposedPopulation) && inputs.exposedPopulation >= 0, critical: false },
    { name: 'historicalFrequency', valid: isValidNum(inputs.historicalFloodFrequency) && inputs.historicalFloodFrequency >= 0, critical: false },
    { name: 'infrastructureVulnerability', valid: isValidNum(inputs.infrastructureVulnerabilityIndex) && inputs.infrastructureVulnerabilityIndex >= 0 && inputs.infrastructureVulnerabilityIndex <= 1, critical: false },
  ];

  const validCount = checks.filter((c) => c.valid).length;
  let rawConf = Math.round((validCount / checks.length) * 100) / 100;

  const failedCritical = checks.filter((c) => !c.valid && c.critical);
  if (failedCritical.length > 0) {
    notes.push(`Missing critical inputs: ${failedCritical.map((c) => c.name).join(', ')}.`);
    rawConf = Math.min(rawConf, 0.35);
  }

  let qualityStatus: 'HIGH' | 'DEGRADED' | 'INSUFFICIENT' = 'HIGH';
  if (failedCritical.length > 0 || rawConf < 0.4) {
    qualityStatus = 'INSUFFICIENT';
  } else if (rawConf < 0.8) {
    qualityStatus = 'DEGRADED';
  }

  return { confidence: rawConf, qualityStatus, notes };
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
  const { confidence, qualityStatus, notes } = evaluateInputIntegrity(inputs);
  const factors            = normaliseFactors(inputs);
  const score              = weightedScore(factors);
  const severity           = toSeverity(score);
  const affectedPopulation = estimateAffectedPopulation(inputs.exposedPopulation, score);

  return {
    score,
    severity,
    factors,
    affectedPopulation,
    confidence,
    qualityStatus,
    evaluationMode: isLive ? 'MEASURED_OBSERVATION' : 'SCENARIO_ESTIMATE',
    modelId: 'disastraaa-flood-det-v1',
    notes: notes.length > 0 ? notes : undefined,
    calculatedAt: new Date().toISOString(),
    isLive,
  };
}
