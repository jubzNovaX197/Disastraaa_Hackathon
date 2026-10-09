/**
 * Model Evaluation & Comparative Performance Engine
 *
 * Computes:
 * - Confusion Matrix (TP, FP, TN, FN)
 * - Precision, Recall, Specificity, F1-Score
 * - False Alarm Rate and Missed Event Rate (critical for disaster warning)
 * - Brier Score (probability calibration error)
 * - Deterministic Risk Engine baseline comparison
 */

import type {
  ConfusionMatrix,
  ModelEvaluationMetrics,
  FloodFeatureRecord,
} from './types';
import { calculateFloodRisk } from '@/lib/risk/flood/calculateFloodRisk';

/**
 * Calculates a complete suite of classification and probabilistic metrics.
 */
export function evaluateClassification(
  yTrue: (0 | 1)[],
  yPred: (0 | 1)[],
  yProba: number[],
  options: {
    modelId: string;
    modelVersion: string;
    splitEvaluated: 'TRAIN' | 'VALIDATION' | 'TEST';
    decisionThreshold?: number;
  },
): ModelEvaluationMetrics {
  const n = yTrue.length;
  const threshold = options.decisionThreshold ?? 0.5;

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let brierSum = 0;

  for (let i = 0; i < n; i++) {
    const actual = yTrue[i];
    const predicted = yPred[i];
    const proba = yProba[i] ?? (predicted === 1 ? 1 : 0);

    brierSum += Math.pow(proba - actual, 2);

    if (actual === 1 && predicted === 1) tp++;
    else if (actual === 0 && predicted === 1) fp++;
    else if (actual === 0 && predicted === 0) tn++;
    else if (actual === 1 && predicted === 0) fn++;
  }

  const confusionMatrix: ConfusionMatrix = {
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    total: n,
  };

  const accuracy = n > 0 ? (tp + tn) / n : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const falseAlarmRate = tn + fp > 0 ? fp / (tn + fp) : 0;
  const missedEventRate = tp + fn > 0 ? fn / (tp + fn) : 0;
  const brierScore = n > 0 ? brierSum / n : 0;

  const positiveClassCount = yTrue.filter((y) => y === 1).length;
  const negativeClassCount = n - positiveClassCount;

  return {
    modelId: options.modelId,
    modelVersion: options.modelVersion,
    splitEvaluated: options.splitEvaluated,
    sampleCount: n,
    positiveClassCount,
    negativeClassCount,
    confusionMatrix,
    accuracy: Math.round(accuracy * 1000) / 1000,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    specificity: Math.round(specificity * 1000) / 1000,
    f1Score: Math.round(f1Score * 1000) / 1000,
    falseAlarmRate: Math.round(falseAlarmRate * 1000) / 1000,
    missedEventRate: Math.round(missedEventRate * 1000) / 1000,
    brierScore: Math.round(brierScore * 1000) / 1000,
    decisionThreshold: threshold,
  };
}

/**
 * Evaluates the existing Stage 4 Deterministic Risk Engine on the given records.
 * Uses deterministic flood score >= 65 as warning threshold.
 */
export function evaluateDeterministicRiskBaseline(
  records: FloodFeatureRecord[],
  split: 'TRAIN' | 'VALIDATION' | 'TEST',
): ModelEvaluationMetrics {
  const yTrue = records.map((r) => r.targetExceededDangerStage);
  const yProba: number[] = [];
  const yPred: (0 | 1)[] = [];

  for (const r of records) {
    const deltaRiver = r.features.gaugeStagePriorM - 170.05;
    const riskResult = calculateFloodRisk({
      rainfallIntensityMmPerDay: r.features.rain24hMm,
      riverLevelMetres: deltaRiver,
      elevationMetres: 25,
      distanceFromRiverKm: 2.0,
      exposedPopulation: 25000,
      historicalFloodFrequency: 6,
      infrastructureVulnerabilityIndex: 0.35,
    });

    const proba = Math.min(Math.max(riskResult.score / 100, 0), 1);
    yProba.push(proba);
    // Warning threshold at score 65
    yPred.push(riskResult.score >= 65 ? 1 : 0);
  }

  return evaluateClassification(yTrue, yPred, yProba, {
    modelId: 'baseline-deterministic-risk-engine',
    modelVersion: 'v1.0.0-heuristic',
    splitEvaluated: split,
    decisionThreshold: 0.65,
  });
}
