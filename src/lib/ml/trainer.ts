/**
 * Machine Learning Experiment Trainer & Orchestrator
 *
 * Coordinates:
 * - Chronological dataset split loading (Train 2018-2021, Val 2022, Test 2023-2024)
 * - Scaler fitting strictly on training split
 * - Training & comparative evaluation across 4 models:
 *   1. Majority Class Baseline
 *   2. Deterministic Risk Engine Baseline (Stage 4)
 *   3. L2-Regularized Logistic Regression
 *   4. Bounded Decision Tree
 * - Metric generation (Confusion Matrix, Precision, Recall, F1, Brier Score)
 * - Model artifact serialization & SHA-256 registry registration
 */

import {
  prepareFloodDataset,
  fitScaler,
  scaleFeatureVector,
  FEATURE_NAMES,
} from './features';
import {
  MajorityClassClassifier,
  LogisticRegressionModel,
  DecisionTreeClassifier,
} from './models';
import {
  evaluateClassification,
  evaluateDeterministicRiskBaseline,
} from './evaluator';
import { saveModelArtifact } from './registry';
import type { ModelEvaluationMetrics, ModelArtifact } from './types';

export interface ExperimentResults {
  timestamp: string;
  datasetSize: {
    train: number;
    validation: number;
    test: number;
    total: number;
  };
  modelsEvaluated: {
    name: string;
    algorithm: string;
    trainMetrics: ModelEvaluationMetrics;
    valMetrics: ModelEvaluationMetrics;
    testMetrics: ModelEvaluationMetrics;
  }[];
  selectedModel: {
    modelId: string;
    version: string;
    artifactPath: string;
    checksum: string;
  };
}

/**
 * Runs the reproducible ML experiment, evaluates all models, and saves the verified artifact.
 */
export async function runMlExperiment(): Promise<ExperimentResults> {
  const allRecords = prepareFloodDataset();

  const trainRecords = allRecords.filter((r) => r.split === 'TRAIN');
  const valRecords = allRecords.filter((r) => r.split === 'VALIDATION');
  const testRecords = allRecords.filter((r) => r.split === 'TEST');

  // 1. Fit scaler strictly on training split
  const scaler = fitScaler(trainRecords, FEATURE_NAMES);

  // 2. Prepare feature matrices
  const X_train = trainRecords.map((r) => scaleFeatureVector(r.features as any, scaler, FEATURE_NAMES));
  const y_train = trainRecords.map((r) => r.targetExceededDangerStage);

  const X_val = valRecords.map((r) => scaleFeatureVector(r.features as any, scaler, FEATURE_NAMES));
  const y_val = valRecords.map((r) => r.targetExceededDangerStage);

  const X_test = testRecords.map((r) => scaleFeatureVector(r.features as any, scaler, FEATURE_NAMES));
  const y_test = testRecords.map((r) => r.targetExceededDangerStage);

  // ── MODEL 1: MAJORITY CLASS BASELINE ──────────────────────────────────────
  const majorityModel = new MajorityClassClassifier();
  majorityModel.fit(y_train);

  const majTrainPred = y_train.map(() => majorityModel.predict());
  const majTrainProba = y_train.map(() => majorityModel.predictProba());
  const majValPred = y_val.map(() => majorityModel.predict());
  const majValProba = y_val.map(() => majorityModel.predictProba());
  const majTestPred = y_test.map(() => majorityModel.predict());
  const majTestProba = y_test.map(() => majorityModel.predictProba());

  const majTrainMetrics = evaluateClassification(y_train, majTrainPred, majTrainProba, {
    modelId: 'baseline-majority-class',
    modelVersion: 'v1.0.0',
    splitEvaluated: 'TRAIN',
  });
  const majValMetrics = evaluateClassification(y_val, majValPred, majValProba, {
    modelId: 'baseline-majority-class',
    modelVersion: 'v1.0.0',
    splitEvaluated: 'VALIDATION',
  });
  const majTestMetrics = evaluateClassification(y_test, majTestPred, majTestProba, {
    modelId: 'baseline-majority-class',
    modelVersion: 'v1.0.0',
    splitEvaluated: 'TEST',
  });

  // ── MODEL 2: DETERMINISTIC RISK ENGINE BASELINE ───────────────────────────
  const detTrainMetrics = evaluateDeterministicRiskBaseline(trainRecords, 'TRAIN');
  const detValMetrics = evaluateDeterministicRiskBaseline(valRecords, 'VALIDATION');
  const detTestMetrics = evaluateDeterministicRiskBaseline(testRecords, 'TEST');

  // ── MODEL 3: L2-REGULARIZED LOGISTIC REGRESSION ───────────────────────────
  const lrModel = new LogisticRegressionModel({
    learningRate: 0.08,
    lambdaL2: 0.02,
    maxEpochs: 400,
  });
  const trainedLr = lrModel.fit(X_train, y_train);

  const lrTrainProba = X_train.map((x) => lrModel.predictProba(x));
  const lrTrainPred = X_train.map((x) => lrModel.predict(x, 0.5));
  const lrValProba = X_val.map((x) => lrModel.predictProba(x));
  const lrValPred = X_val.map((x) => lrModel.predict(x, 0.5));
  const lrTestProba = X_test.map((x) => lrModel.predictProba(x));
  const lrTestPred = X_test.map((x) => lrModel.predict(x, 0.5));

  const lrTrainMetrics = evaluateClassification(y_train, lrTrainPred, lrTrainProba, {
    modelId: 'flood-exceedance-logistic-regression',
    modelVersion: 'v1.0.0',
    splitEvaluated: 'TRAIN',
    decisionThreshold: 0.5,
  });
  const lrValMetrics = evaluateClassification(y_val, lrValPred, lrValProba, {
    modelId: 'flood-exceedance-logistic-regression',
    modelVersion: 'v1.0.0',
    splitEvaluated: 'VALIDATION',
    decisionThreshold: 0.5,
  });
  const lrTestMetrics = evaluateClassification(y_test, lrTestPred, lrTestProba, {
    modelId: 'flood-exceedance-logistic-regression',
    modelVersion: 'v1.0.0',
    splitEvaluated: 'TEST',
    decisionThreshold: 0.5,
  });

  // ── MODEL 4: BOUNDED DECISION TREE ────────────────────────────────────────
  const dtModel = new DecisionTreeClassifier({ maxDepth: 3, minSamplesSplit: 2 });
  const rootNode = dtModel.fit(X_train, y_train);

  const dtTrainProba = X_train.map((x) => dtModel.predictProba(x));
  const dtTrainPred = X_train.map((x) => dtModel.predict(x, 0.5));
  const dtValProba = X_val.map((x) => dtModel.predictProba(x));
  const dtValPred = X_val.map((x) => dtModel.predict(x, 0.5));
  const dtTestProba = X_test.map((x) => dtModel.predictProba(x));
  const dtTestPred = X_test.map((x) => dtModel.predict(x, 0.5));

  const dtTrainMetrics = evaluateClassification(y_train, dtTrainPred, dtTrainProba, {
    modelId: 'flood-exceedance-decision-tree',
    modelVersion: 'v1.0.0',
    splitEvaluated: 'TRAIN',
  });
  const dtValMetrics = evaluateClassification(y_val, dtValPred, dtValProba, {
    modelId: 'flood-exceedance-decision-tree',
    modelVersion: 'v1.0.0',
    splitEvaluated: 'VALIDATION',
  });
  const dtTestMetrics = evaluateClassification(y_test, dtTestPred, dtTestProba, {
    modelId: 'flood-exceedance-decision-tree',
    modelVersion: 'v1.0.0',
    splitEvaluated: 'TEST',
  });

  // ── SAVE PRODUCTION CANDIDATE ARTIFACT (LOGISTIC REGRESSION) ──────────────
  const candidateArtifact: Omit<ModelArtifact, 'artifactChecksumSha256'> = {
    modelId: 'flood-exceedance-lr',
    version: 'v1.0.0',
    task: '6-Hour Kesinga River Threshold Exceedance (>= 170.05m MSL)',
    algorithm: 'LOGISTIC_REGRESSION',
    featureNames: FEATURE_NAMES,
    scaler,
    hyperparameters: {
      learningRate: 0.08,
      lambdaL2: 0.02,
      maxEpochs: 400,
      decisionThreshold: 0.5,
    },
    weights: {
      coefficients: trainedLr.weights,
      intercept: trainedLr.intercept,
    },
    decisionThreshold: 0.5,
    trainingMetrics: lrTrainMetrics,
    validationMetrics: lrValMetrics,
    testMetrics: lrTestMetrics,
    datasetManifestId: 'manifest_ml_kalahandi_flood_v1',
    datasetContentHash: 'cwc_kesinga_2018_2024_monsoon_v1',
    createdAt: new Date().toISOString(),
  };

  const saveResult = await saveModelArtifact(candidateArtifact);

  return {
    timestamp: new Date().toISOString(),
    datasetSize: {
      train: trainRecords.length,
      validation: valRecords.length,
      test: testRecords.length,
      total: allRecords.length,
    },
    modelsEvaluated: [
      {
        name: 'Majority Class (Zero-Rule)',
        algorithm: 'MAJORITY_CLASS',
        trainMetrics: majTrainMetrics,
        valMetrics: majValMetrics,
        testMetrics: majTestMetrics,
      },
      {
        name: 'Deterministic Risk Engine (Stage 4)',
        algorithm: 'DETERMINISTIC_HEURISTIC',
        trainMetrics: detTrainMetrics,
        valMetrics: detValMetrics,
        testMetrics: detTestMetrics,
      },
      {
        name: 'Logistic Regression (L2 Regularized)',
        algorithm: 'LOGISTIC_REGRESSION',
        trainMetrics: lrTrainMetrics,
        valMetrics: lrValMetrics,
        testMetrics: lrTestMetrics,
      },
      {
        name: 'Decision Tree (Depth-Bounded)',
        algorithm: 'RANDOM_FOREST',
        trainMetrics: dtTrainMetrics,
        valMetrics: dtValMetrics,
        testMetrics: dtTestMetrics,
      },
    ],
    selectedModel: {
      modelId: 'flood-exceedance-lr',
      version: 'v1.0.0',
      artifactPath: saveResult.artifactPath,
      checksum: saveResult.checksum,
    },
  };
}
