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
function normaliseFactors(inputs: CycloneRiskInputs): CycloneFactorScores {
  // Wind speed: Saffir-Simpson inspired — 63 km/h (tropical storm threshold) → 0;
  // 250+ km/h (extreme severe) → 100
  const rawWind = isValidNum(inputs.windSpeedKmh) ? Math.max(0, inputs.windSpeedKmh) : 0;
  const windSpeed = linearNorm(rawWind, 63, 250);

  // Rainfall: 0 mm/day → 0; 400+ mm/day → 100 (cyclonic extreme)
  const rawRain = isValidNum(inputs.rainfallMmPerDay) ? Math.max(0, inputs.rainfallMmPerDay) : 0;
  const rainfall = linearNorm(rawRain, 0, 400);

  // Storm surge: 0 m → 0; 6+ m → 100 (catastrophic inundation threshold)
  const rawSurge = isValidNum(inputs.stormSurgeMetres) ? Math.max(0, inputs.stormSurgeMetres) : 0;
  const stormSurge = linearNorm(rawSurge, 0, 6);

  // Track proximity: inverse — 0 km (on track) = 100; 200+ km = 0
  const rawDist = isValidNum(inputs.distanceFromTrackKm) ? Math.max(0, inputs.distanceFromTrackKm) : 100;
  const trackProximity = clamp(100 - linearNorm(rawDist, 0, 200), 0, 100);

  // Population exposure: 0 → 0; 1 000 000+ → 100
  const rawPop = isValidNum(inputs.exposedPopulation) ? Math.max(0, inputs.exposedPopulation) : 0;
  const population = linearNorm(rawPop, 0, 1_000_000);

  // Elevation: inverse — 0 m MSL = 100 risk; 30+ m = 0 risk (coastal focus)
  const rawElev = isValidNum(inputs.elevationMetres) ? inputs.elevationMetres : 15;
  const elevation = clamp(100 - linearNorm(rawElev, 0, 30), 0, 100);

  // Historical frequency: 0 events/decade → 0; 10+ → 100
  const rawHist = isValidNum(inputs.historicalCycloneFrequency) ? Math.max(0, inputs.historicalCycloneFrequency) : 0;
  const historicalFrequency = linearNorm(rawHist, 0, 10);

  // Infrastructure vulnerability: already 0–1, scale to 0–100
  const rawVuln = isValidNum(inputs.infrastructureVulnerabilityIndex)
    ? clamp(inputs.infrastructureVulnerabilityIndex, 0, 1)
    : 0.3;
  const infrastructureVulnerability = clamp(rawVuln * 100, 0, 100);

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

/**
 * Estimate affected population: linear proxy from composite score.
 * Provisional scenario estimate.
 */
function estimateAffectedPopulation(population: number, score: number): number {
  const pop = isValidNum(population) ? Math.max(0, population) : 0;
  return Math.round(pop * clamp(score / 100, 0, 1));
}

function evaluateInputIntegrity(inputs: CycloneRiskInputs): {
  confidence: number;
  qualityStatus: 'HIGH' | 'DEGRADED' | 'INSUFFICIENT';
  notes: string[];
} {
  const notes: string[] = [];
  const checks = [
    { name: 'windSpeed', valid: isValidNum(inputs.windSpeedKmh) && inputs.windSpeedKmh >= 0, critical: true },
    { name: 'rainfall', valid: isValidNum(inputs.rainfallMmPerDay) && inputs.rainfallMmPerDay >= 0, critical: false },
    { name: 'stormSurge', valid: isValidNum(inputs.stormSurgeMetres) && inputs.stormSurgeMetres >= 0, critical: false },
    { name: 'distanceFromTrack', valid: isValidNum(inputs.distanceFromTrackKm) && inputs.distanceFromTrackKm >= 0, critical: false },
    { name: 'population', valid: isValidNum(inputs.exposedPopulation) && inputs.exposedPopulation >= 0, critical: false },
    { name: 'elevation', valid: isValidNum(inputs.elevationMetres), critical: false },
    { name: 'historicalFrequency', valid: isValidNum(inputs.historicalCycloneFrequency) && inputs.historicalCycloneFrequency >= 0, critical: false },
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
    modelId: 'disastraaa-cyclone-det-v1',
    notes: notes.length > 0 ? notes : undefined,
    calculatedAt: new Date().toISOString(),
    isLive,
  };
}
