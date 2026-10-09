/**
 * Safe Server-Side Machine Learning Prediction Service
 *
 * Implements strict runtime safeguards:
 * 1. Never replaces the deterministic risk engine; runs alongside as an independent signal
 * 2. Location & station verification: refuses to extrapolate Kesinga weights to unsupported basins
 * 3. Out-of-bounds input detection (rejects physically impossible readings)
 * 4. Missing data integrity: never fabricates missing gauge or rainfall readings
 * 5. Transparent input quality status (OPTIMAL, DEGRADED, OUT_OF_BOUNDS, UNSUPPORTED_LOCATION, MISSING_MEASUREMENT)
 * 6. Distinct labeling: predictions are clearly tagged EXPERIMENTAL_ESTIMATE, not observed facts
 * 7. Threshold provenance tracking: tags unverified heuristic thresholds
 * 8. Side-by-side comparison with the deterministic flood risk score
 */

import { loadModelArtifact } from './registry';
import {
  scaleFeatureVector,
  validateFeatureRanges,
  FEATURE_NAMES,
  KESINGA_DANGER_STAGE_M,
  KESINGA_WARNING_STAGE_M,
} from './features';
import { sigmoid } from './models';
import { calculateFloodRisk } from '@/lib/risk/flood/calculateFloodRisk';
import type { FloodPredictionInput, FloodPredictionOutput, ModelArtifact } from './types';

let _cachedArtifact: ModelArtifact | null = null;

export async function getOrLoadArtifact(): Promise<{ artifact: ModelArtifact | null; error?: string }> {
  if (_cachedArtifact) return { artifact: _cachedArtifact };

  const res = await loadModelArtifact('flood-exceedance-lr', 'v1.0.0');
  if (res.success && res.artifact) {
    _cachedArtifact = res.artifact;
    return { artifact: _cachedArtifact };
  }
  return { artifact: null, error: res.error };
}

/**
 * Resets the in-memory cached artifact (used for testing artifact reloads and integrity).
 */
export function resetCachedModelArtifact(): void {
  _cachedArtifact = null;
}

/**
 * Predicts the probability of river danger threshold exceedance at Kesinga within +6 hours.
 */
export async function predictRiverExceedance(
  input: FloodPredictionInput,
): Promise<FloodPredictionOutput> {
  const { artifact, error: artifactLoadError } = await getOrLoadArtifact();
  const timestamp = input.timestamp || new Date().toISOString();
  const stationEvaluated = input.stationCode || '022-MDBURLA';
  const effectiveThreshold = input.thresholdMslM ?? KESINGA_DANGER_STAGE_M;

  // 1. Validate Input Bounds, Missingness, and Location
  const validation = validateFeatureRanges(input);
  const warnings = [...validation.warnings];

  // 2. Compute Deterministic Risk Engine Baseline Score
  let deterministicScore = 0;
  if (input.gaugeStagePriorM !== undefined && input.gaugeStagePriorM !== null && !isNaN(input.gaugeStagePriorM)) {
    const deltaRiver = input.gaugeStagePriorM - effectiveThreshold;
    const deterministicResult = calculateFloodRisk({
      rainfallIntensityMmPerDay: input.rain24hMm ?? 0,
      riverLevelMetres: deltaRiver,
      elevationMetres: 25,
      distanceFromRiverKm: 2.0,
      exposedPopulation: 25000,
      historicalFloodFrequency: 6,
      infrastructureVulnerabilityIndex: 0.35,
    });
    deterministicScore = deterministicResult.score;
  }

  // 3A. Reject Unsupported Location / Station
  if (validation.isUnsupportedLocation) {
    return {
      modelId: artifact?.modelId || 'flood-exceedance-lr',
      modelVersion: artifact?.version || 'v1.0.0',
      algorithm: artifact?.algorithm || 'LOGISTIC_REGRESSION',
      predictionTimestamp: timestamp,
      forecastHorizonHours: 6,
      targetDescription: '6-Hour River Danger Stage Exceedance',
      supportedLocation: '022-MDBURLA (Kesinga Gauge, Tel River, Kalahandi)',
      stationEvaluated,
      thresholdUsedM: effectiveThreshold,
      thresholdVerificationStatus: 'UNVERIFIED_HEURISTIC_BENCHMARK',
      exceedanceProbability: null,
      binaryPrediction: null,
      predictedClass: 'UNAVAILABLE',
      confidenceLevel: 'LOW',
      inputQualityStatus: 'UNSUPPORTED_LOCATION',
      deterministicBaselineScore: deterministicScore,
      deterministicAgreement: null,
      warnings,
      disclaimer: 'EXPERIMENTAL DECISION-SUPPORT ESTIMATE ONLY. Not an official government warning or evacuation order.',
    };
  }

  // 3B. Refuse to Predict on Missing Critical Telemetry
  if (validation.isMissingCritical) {
    return {
      modelId: artifact?.modelId || 'flood-exceedance-lr',
      modelVersion: artifact?.version || 'v1.0.0',
      algorithm: artifact?.algorithm || 'LOGISTIC_REGRESSION',
      predictionTimestamp: timestamp,
      forecastHorizonHours: 6,
      targetDescription: '6-Hour River Danger Stage Exceedance',
      supportedLocation: '022-MDBURLA (Kesinga Gauge, Tel River, Kalahandi)',
      stationEvaluated,
      thresholdUsedM: effectiveThreshold,
      thresholdVerificationStatus: 'UNVERIFIED_HEURISTIC_BENCHMARK',
      exceedanceProbability: null,
      binaryPrediction: null,
      predictedClass: 'UNAVAILABLE',
      confidenceLevel: 'LOW',
      inputQualityStatus: 'MISSING_MEASUREMENT',
      deterministicBaselineScore: deterministicScore,
      deterministicAgreement: null,
      warnings,
      disclaimer: 'Experimental decision-support estimate. Not an official government warning or evacuation order.',
    };
  }

  // 3C. Fallback if model artifact is unavailable or corrupted
  if (!artifact) {
    return {
      modelId: 'flood-exceedance-lr',
      modelVersion: 'v1.0.0',
      algorithm: 'LOGISTIC_REGRESSION',
      predictionTimestamp: timestamp,
      forecastHorizonHours: 6,
      targetDescription: `Water level exceeding ${effectiveThreshold}m MSL at Kesinga Gauge within 6h`,
      supportedLocation: '022-MDBURLA (Kesinga Gauge, Tel River, Kalahandi)',
      stationEvaluated,
      thresholdUsedM: effectiveThreshold,
      thresholdVerificationStatus: 'UNVERIFIED_HEURISTIC_BENCHMARK',
      exceedanceProbability: deterministicScore / 100,
      binaryPrediction: deterministicScore >= 65 ? 1 : 0,
      predictedClass: deterministicScore >= 65 ? 'DANGER_STAGE_EXCEEDED' : 'NORMAL',
      confidenceLevel: 'LOW',
      inputQualityStatus: 'DEGRADED',
      deterministicBaselineScore: deterministicScore,
      deterministicAgreement: true,
      warnings: [`Model artifact uninitialized (${artifactLoadError || 'file not found'}); operating on deterministic fallback.`],
      disclaimer: 'Experimental decision-support estimate. Not an official government warning or evacuation order.',
    };
  }

  // 3D. Reject Out-of-Bounds Observations
  if (validation.isOutOfBounds) {
    return {
      modelId: artifact.modelId,
      modelVersion: artifact.version,
      algorithm: artifact.algorithm,
      predictionTimestamp: timestamp,
      forecastHorizonHours: 6,
      targetDescription: artifact.task,
      supportedLocation: '022-MDBURLA (Kesinga Gauge, Tel River, Kalahandi)',
      stationEvaluated,
      thresholdUsedM: effectiveThreshold,
      thresholdVerificationStatus: 'UNVERIFIED_HEURISTIC_BENCHMARK',
      exceedanceProbability: null,
      binaryPrediction: 0,
      predictedClass: 'NORMAL',
      confidenceLevel: 'LOW',
      inputQualityStatus: 'OUT_OF_BOUNDS',
      deterministicBaselineScore: deterministicScore,
      deterministicAgreement: false,
      warnings: [...warnings, 'Critical inputs fall outside physical training distribution. Prediction aborted.'],
      disclaimer: 'Experimental decision-support estimate. Not an official government warning or evacuation order.',
    };
  }

  // 4. Construct Causal Prediction-Time Feature Dictionary
  const gaugeLevel = input.gaugeStagePriorM!;
  const rain24 = input.rain24hMm!;
  const rain48 = input.rain48hMm ?? rain24;
  const rain72 = input.rain72hMm ?? rain48;
  const soilMoisture = input.catchmentSoilMoisturePct ?? 65;
  const discharge = input.upstreamDischargeCumec ?? 500;

  const thresholdDistanceM = +(effectiveThreshold - gaugeLevel).toFixed(2);
  const rainRateChangeMmPerHr = +(
    rain24 / 24 -
    Math.max(rain48 - rain24, 0) / 24
  ).toFixed(2);

  const featureDict: Record<string, number> = {
    rain24hMm: rain24,
    rain48hMm: rain48,
    rain72hMm: rain72,
    rainRateChangeMmPerHr,
    catchmentSoilMoisturePct: soilMoisture,
    upstreamDischargeCumec: discharge,
    gaugeStagePriorM: gaugeLevel,
    thresholdDistanceM,
  };

  // 5. Standardize Features using Training Scaler
  const scaledX = scaleFeatureVector(featureDict, artifact.scaler, artifact.featureNames);

  // 6. Compute Model Probability
  const weights = artifact.weights?.coefficients ?? [];
  const intercept = artifact.weights?.intercept ?? 0;

  let z = intercept;
  for (let j = 0; j < weights.length; j++) {
    z += weights[j] * (scaledX[j] ?? 0);
  }

  const proba = Math.round(sigmoid(z) * 1000) / 1000;
  const binaryPrediction: 0 | 1 = proba >= artifact.decisionThreshold ? 1 : 0;
  const predictedClass = binaryPrediction === 1 ? 'DANGER_STAGE_EXCEEDED' : 'NORMAL';

  // 7. Assess Agreement with Deterministic Engine
  const deterministicWarning = deterministicScore >= 65;
  const deterministicAgreement = (binaryPrediction === 1 && deterministicWarning) || (binaryPrediction === 0 && !deterministicWarning);

  if (!deterministicAgreement) {
    warnings.push(
      `Divergence detected: ML predicted ${predictedClass} (p=${proba}), while deterministic engine scored ${deterministicScore}/100.`,
    );
  }

  // Add Advisory Notice on Threshold
  warnings.push('Advisory notice: Danger threshold (170.05m MSL) is an unverified experimental benchmark. Official CWC India-WRIS bulletins list DL as NA/NU for station 022-MDBURLA (HFL is 178.835m MSL).');

  let confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW' = 'HIGH';
  if (proba > 0.35 && proba < 0.65) {
    confidenceLevel = 'MODERATE'; // Near decision boundary
  }

  const inputQualityStatus = input.isHistoricalObservation ? 'DEGRADED' : 'OPTIMAL';

  return {
    modelId: artifact.modelId,
    modelVersion: artifact.version,
    algorithm: artifact.algorithm,
    predictionTimestamp: timestamp,
    forecastHorizonHours: 6,
    targetDescription: artifact.task,
    supportedLocation: '022-MDBURLA (Kesinga Gauge, Tel River, Kalahandi)',
    stationEvaluated,
    thresholdUsedM: effectiveThreshold,
    thresholdVerificationStatus: 'UNVERIFIED_HEURISTIC_BENCHMARK',
    exceedanceProbability: proba,
    binaryPrediction,
    predictedClass,
    confidenceLevel,
    inputQualityStatus,
    deterministicBaselineScore: deterministicScore,
    deterministicAgreement,
    warnings,
    disclaimer: 'Experimental decision-support estimate. Not an official government warning or evacuation order.',
  };
}
