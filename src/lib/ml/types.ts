/**
 * Disastraaa Stage 7: ML Platform & Evaluation Contracts
 *
 * Defines typed schemas for:
 * - Feature vectors with causal prediction-time timestamps
 * - Train / Validation / Test chronological splits
 * - Model evaluation metrics (Precision, Recall, F1, Brier, Confusion Matrix)
 * - Model artifact metadata and registry contracts
 * - Server-side inference request & response contracts
 */

export interface FloodFeatureRecord {
  eventId: string;
  stationCode: string;
  district: string;
  predictionTimestamp: string; // T_0 (features available at or before this timestamp)
  targetTimestamp: string;     // T_target = T_0 + 6h
  features: {
    rain24hMm: number;
    rain48hMm: number;
    rain72hMm: number;
    rainRateChangeMmPerHr: number;
    catchmentSoilMoisturePct: number;
    upstreamDischargeCumec: number;
    gaugeStagePriorM: number;
    thresholdDistanceM: number; // 170.05 - gaugeStagePriorM
  };
  targetExceededDangerStage: 0 | 1; // 1 = water level >= 170.05m MSL at targetTimestamp
  split: 'TRAIN' | 'VALIDATION' | 'TEST';
}

export interface ScalerParams {
  mean: Record<string, number>;
  std: Record<string, number>;
}

export interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  total: number;
}

export interface ModelEvaluationMetrics {
  modelId: string;
  modelVersion: string;
  splitEvaluated: 'TRAIN' | 'VALIDATION' | 'TEST';
  sampleCount: number;
  positiveClassCount: number;
  negativeClassCount: number;
  confusionMatrix: ConfusionMatrix;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1Score: number;
  falseAlarmRate: number; // FP / (FP + TN)
  missedEventRate: number; // FN / (FN + TP)
  brierScore: number;     // Mean squared probability error
  decisionThreshold: number;
}

export interface ModelArtifact {
  modelId: string;
  version: string;
  task: string;
  algorithm: 'MAJORITY_CLASS' | 'DETERMINISTIC_HEURISTIC' | 'LOGISTIC_REGRESSION' | 'RANDOM_FOREST';
  featureNames: string[];
  scaler: ScalerParams;
  hyperparameters: Record<string, any>;
  weights?: {
    coefficients: number[];
    intercept: number;
  };
  trees?: any[]; // For Random Forest / Decision Trees
  decisionThreshold: number;
  trainingMetrics: ModelEvaluationMetrics;
  validationMetrics: ModelEvaluationMetrics;
  testMetrics: ModelEvaluationMetrics;
  datasetManifestId: string;
  datasetContentHash: string;
  artifactChecksumSha256: string;
  createdAt: string;
}

export interface FloodPredictionInput {
  stationCode?: string;
  district?: string;
  timestamp?: string; // T_0
  rain24hMm?: number;
  rain48hMm?: number;
  rain72hMm?: number;
  catchmentSoilMoisturePct?: number;
  upstreamDischargeCumec?: number;
  gaugeStagePriorM?: number;
  thresholdMslM?: number;
  isHistoricalObservation?: boolean;
}

export interface FloodPredictionOutput {
  modelId: string;
  modelVersion: string;
  algorithm: string;
  predictionTimestamp: string;
  forecastHorizonHours: number; // e.g. 6 hours
  targetDescription: string;
  supportedLocation: string;
  stationEvaluated: string;
  thresholdUsedM: number;
  thresholdVerificationStatus: 'UNVERIFIED_HEURISTIC_BENCHMARK' | 'OFFICIAL_CWC_VERIFIED';
  exceedanceProbability: number | null; // null if degraded/unavailable
  binaryPrediction: 0 | 1 | null;
  predictedClass: 'NORMAL' | 'DANGER_STAGE_EXCEEDED' | 'UNAVAILABLE';
  confidenceLevel: 'HIGH' | 'MODERATE' | 'LOW';
  inputQualityStatus: 'OPTIMAL' | 'DEGRADED' | 'OUT_OF_BOUNDS' | 'UNSUPPORTED_LOCATION' | 'MISSING_MEASUREMENT';
  deterministicBaselineScore: number; // Comparison with Stage 4 risk engine
  deterministicAgreement: boolean | null;
  warnings: string[];
  disclaimer: string;
}
