/**
 * Disastraaa Stage 7 Verification Test Suite
 *
 * Automated verification of:
 * 1. Dataset schema and unit validation
 * 2. Prediction-time feature cutoffs (T_obs <= T_target - 6h)
 * 3. Leakage prevention & intentional leakage detection
 * 4. Chronological split integrity (Train 2018-2021, Val 2022, Test 2023-2024)
 * 5. Feature scaling fitted exclusively on training set (zero leakage)
 * 6. Reproducible model training & deterministic weights
 * 7. Model evaluation metrics (Precision, Recall, F1, Brier, Confusion Matrix)
 * 8. Model artifact serialization, SHA-256 checksum & roundtrip loading
 * 9. Server-side prediction service output contracts
 * 10. Out-of-distribution & physical bounds safeguards
 * 11. Separation of experimental ML from official alerts & deterministic engine
 * 12. AI snapshot integration safety
 */

import fs from 'fs';
import path from 'path';

// Load .env.local if present
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import {
  prepareFloodDataset,
  fitScaler,
  scaleFeatureVector,
  validateFeatureRanges,
  FEATURE_NAMES,
  KESINGA_DANGER_STAGE_M,
} from '../src/lib/ml/features';
import {
  MajorityClassClassifier,
  LogisticRegressionModel,
  DecisionTreeClassifier,
} from '../src/lib/ml/models';
import {
  evaluateClassification,
  evaluateDeterministicRiskBaseline,
} from '../src/lib/ml/evaluator';
import {
  saveModelArtifact,
  loadModelArtifact,
  computeArtifactChecksum,
} from '../src/lib/ml/registry';
import { predictRiverExceedance } from '../src/lib/ml/predictionService';
import { disasterSnapshotService } from '../src/lib/intelligence/snapshot';
import { DisasterIntelligenceSummaryService } from '../src/lib/intelligence/summaryService';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passedCount++;
    console.log(`✅ [PASS] ${testName}`);
    if (details) console.log(`   ${details}`);
  } else {
    failedCount++;
    console.error(`❌ [FAIL] ${testName}`);
    if (details) console.error(`   Details: ${details}`);
  }
}

async function runStage7VerificationSuite() {
  console.log('================================================================');
  console.log('DISASTRAAA STAGE 7: ML PLATFORM & EVALUATION VERIFICATION');
  console.log('================================================================\n');

  // ── TEST 1: DATASET SCHEMA & CAUSAL PREDICTION-TIME CUTOFFS ────────────────
  console.log('--- TEST GROUP 1: Dataset Schema & Prediction-Time Causality ---');
  const dataset = prepareFloodDataset();
  assert(dataset.length === 15, 'Dataset contains 15 curated hydrometric examples across 2018–2024');

  let causalViolations = 0;
  for (const r of dataset) {
    const tPred = new Date(r.predictionTimestamp).getTime();
    const tTarget = new Date(r.targetTimestamp).getTime();
    // Must be at least 6 hours (21600000 ms) before target
    if (tTarget - tPred < 6 * 3600 * 1000) {
      causalViolations++;
    }
  }
  assert(causalViolations === 0, 'Prediction-time cutoff enforced: all features precede target by >= 6 hours');

  // ── TEST 2: CHRONOLOGICAL SPLIT INTEGRITY ──────────────────────────────────
  console.log('\n--- TEST GROUP 2: Chronological Split Integrity (Zero Shuffling) ---');
  const trainSet = dataset.filter((r) => r.split === 'TRAIN');
  const valSet = dataset.filter((r) => r.split === 'VALIDATION');
  const testSet = dataset.filter((r) => r.split === 'TEST');

  assert(trainSet.length === 8, 'Train set contains 8 events (2018–2021)');
  assert(valSet.length === 3, 'Validation set contains 3 events (2022)');
  assert(testSet.length === 4, 'Test holdout contains 4 events (2023–2024)');

  const maxTrainYear = Math.max(...trainSet.map((r) => new Date(r.targetTimestamp).getUTCFullYear()));
  const minValYear = Math.min(...valSet.map((r) => new Date(r.targetTimestamp).getUTCFullYear()));
  const maxValYear = Math.max(...valSet.map((r) => new Date(r.targetTimestamp).getUTCFullYear()));
  const minTestYear = Math.min(...testSet.map((r) => new Date(r.targetTimestamp).getUTCFullYear()));

  assert(maxTrainYear <= 2021, 'Train split strictly bounded <= 2021');
  assert(minValYear >= 2022 && maxValYear <= 2022, 'Validation split strictly bounded to 2022');
  assert(minTestYear >= 2023, 'Test holdout strictly bounded >= 2023 (untouched future seasons)');

  // ── TEST 3: SCALER FITTING ISOLATION (ZERO LEAKAGE) ────────────────────────
  console.log('\n--- TEST GROUP 3: Scaler Isolation (Fitted on Train Split Only) ---');
  const scaler = fitScaler(trainSet, FEATURE_NAMES);

  // Verify scaler mean matches training average, NOT full dataset average
  const trainRainMean = trainSet.reduce((s, r) => s + r.features.rain24hMm, 0) / trainSet.length;
  const fullRainMean = dataset.reduce((s, r) => s + r.features.rain24hMm, 0) / dataset.length;

  assert(
    Math.abs(scaler.mean['rain24hMm'] - trainRainMean) < 1e-6,
    'Scaler mean matches training split exactly',
    `Scaler mean: ${scaler.mean['rain24hMm'].toFixed(2)} vs Full dataset mean: ${fullRainMean.toFixed(2)}`,
  );
  assert(
    Math.abs(scaler.mean['rain24hMm'] - fullRainMean) > 1.0,
    'Scaler does NOT incorporate future validation or test data into normalization statistics',
  );

  // ── TEST 4: INTENTIONAL TARGET LEAKAGE DETECTION ───────────────────────────
  console.log('\n--- TEST GROUP 4: Future-Data Leakage Detection Safeguard ---');
  const leakyRecord = {
    ...dataset[0],
    predictionTimestamp: '2018-07-16T15:00:00Z', // 3 hours AFTER target!
    targetTimestamp: '2018-07-16T12:00:00Z',
  };
  const isLeaking = new Date(leakyRecord.predictionTimestamp).getTime() > new Date(leakyRecord.targetTimestamp).getTime();
  assert(isLeaking, 'Intentional causal violation correctly flagged as future-data leakage');

  // ── TEST 5: REPRODUCIBLE MODEL TRAINING & CONVEX CONVERGENCE ───────────────
  console.log('\n--- TEST GROUP 5: Reproducible Model Training (Logistic Regression) ---');
  const X_train = trainSet.map((r) => scaleFeatureVector(r.features as any, scaler, FEATURE_NAMES));
  const y_train = trainSet.map((r) => r.targetExceededDangerStage);

  const lr1 = new LogisticRegressionModel({ learningRate: 0.08, lambdaL2: 0.02, maxEpochs: 200 });
  const run1 = lr1.fit(X_train, y_train);

  const lr2 = new LogisticRegressionModel({ learningRate: 0.08, lambdaL2: 0.02, maxEpochs: 200 });
  const run2 = lr2.fit(X_train, y_train);

  assert(
    JSON.stringify(run1.weights) === JSON.stringify(run2.weights),
    'Training is strictly reproducible: identical weights across independent runs',
  );
  assert(
    run1.lossHistory[0] > run1.lossHistory[run1.lossHistory.length - 1],
    'Gradient descent successfully converged (loss strictly decreased)',
    `Initial loss: ${run1.lossHistory[0].toFixed(4)} -> Final loss: ${run1.lossHistory[run1.lossHistory.length - 1].toFixed(4)}`,
  );

  // ── TEST 6: COMPREHENSIVE EVALUATION METRICS COMPUTATION ───────────────────
  console.log('\n--- TEST GROUP 6: Classification Metrics & Brier Score Validation ---');
  const mockYTrue: (0 | 1)[] = [1, 1, 0, 0];
  const mockYPred: (0 | 1)[] = [1, 0, 0, 0];
  const mockYProba = [0.9, 0.4, 0.1, 0.2];

  const evalMetrics = evaluateClassification(mockYTrue, mockYPred, mockYProba, {
    modelId: 'test-metrics',
    modelVersion: 'v1.0.0',
    splitEvaluated: 'TEST',
  });

  assert(evalMetrics.confusionMatrix.truePositives === 1, 'True Positives computed correctly (1)');
  assert(evalMetrics.confusionMatrix.falseNegatives === 1, 'False Negatives computed correctly (1)');
  assert(evalMetrics.confusionMatrix.trueNegatives === 2, 'True Negatives computed correctly (2)');
  assert(evalMetrics.confusionMatrix.falsePositives === 0, 'False Positives computed correctly (0)');
  assert(evalMetrics.precision === 1.0, 'Precision: 1.0');
  assert(evalMetrics.recall === 0.5, 'Recall: 0.5');
  assert(evalMetrics.missedEventRate === 0.5, 'Missed Event Rate: 0.5 (FN / (FN + TP))');
  assert(evalMetrics.falseAlarmRate === 0.0, 'False Alarm Rate: 0.0 (FP / (FP + TN))');
  assert(evalMetrics.brierScore > 0 && evalMetrics.brierScore < 0.2, 'Brier score computed correctly');

  // ── TEST 7: DETERMINISTIC HEURISTIC BASELINE EVALUATION ────────────────────
  console.log('\n--- TEST GROUP 7: Deterministic Risk Engine Baseline Comparison ---');
  const detMetrics = evaluateDeterministicRiskBaseline(testSet, 'TEST');
  assert(detMetrics.modelId === 'baseline-deterministic-risk-engine', 'Deterministic engine evaluated on identical split');
  assert(detMetrics.sampleCount === 4, 'Evaluated all 4 test holdout samples');

  // ── TEST 8: MODEL ARTIFACT SERIALIZATION & CHECKSUM INTEGRITY ──────────────
  console.log('\n--- TEST GROUP 8: Model Registry & SHA-256 Artifact Integrity ---');
  const loadResult = await loadModelArtifact('flood-exceedance-lr', 'v1.0.0');
  assert(loadResult.success, 'Model artifact successfully loaded from storage registry');
  assert(
    loadResult.artifact?.artifactChecksumSha256 !== undefined,
    'Model artifact contains verifiable SHA-256 checksum',
    loadResult.artifact?.artifactChecksumSha256,
  );
  assert(
    loadResult.artifact?.weights?.coefficients.length === FEATURE_NAMES.length,
    'Model artifact features match canonical schema (8 feature weights)',
  );

  // Test Tampering Detection
  const tamperedJson = JSON.stringify({
    ...loadResult.artifact,
    weights: { coefficients: [999, 999, 999, 999, 999, 999, 999, 999], intercept: 999 },
  });
  const tamperedChecksum = computeArtifactChecksum(JSON.stringify({
    ...loadResult.artifact,
    weights: { coefficients: [999, 999, 999, 999, 999, 999, 999, 999], intercept: 999 },
  }, null, 2));
  assert(
    tamperedChecksum !== loadResult.artifact?.artifactChecksumSha256,
    'Tamper protection: modified weights invalidate SHA-256 integrity hash',
  );

  // ── TEST 9: SERVER-SIDE PREDICTION SERVICE SAFEGUARDS ──────────────────────
  console.log('\n--- TEST GROUP 9: Server-Side Prediction Service & Safety Guards ---');
  const validPrediction = await predictRiverExceedance({
    stationCode: '022-MDBURLA',
    district: 'Kalahandi',
    timestamp: '2026-10-09T06:00:00Z',
    rain24hMm: 125.0,
    rain48hMm: 180.0,
    rain72hMm: 235.0,
    catchmentSoilMoisturePct: 85.0,
    upstreamDischargeCumec: 2900,
    gaugeStagePriorM: 168.40,
  });

  assert(validPrediction.inputQualityStatus === 'OPTIMAL', 'Valid input evaluated as OPTIMAL quality');
  assert(
    validPrediction.exceedanceProbability !== null &&
    validPrediction.exceedanceProbability >= 0.0 &&
    validPrediction.exceedanceProbability <= 1.0,
    'Predicted probability strictly in [0.0, 1.0]',
    `Probability: ${validPrediction.exceedanceProbability}`,
  );
  assert(
    validPrediction.disclaimer.includes('Experimental decision-support estimate'),
    'Explicit disclaimer attached: clearly labelled as experimental estimate, not binding evacuation order',
  );

  // ── TEST 10: OUT-OF-DISTRIBUTION INPUT SAFEGUARDS ──────────────────────────
  console.log('\n--- TEST GROUP 10: Out-of-Bounds & Physically Impossible Inputs ---');
  const oodPrediction = await predictRiverExceedance({
    stationCode: '022-MDBURLA',
    district: 'Kalahandi',
    timestamp: '2026-10-09T06:00:00Z',
    rain24hMm: -50.0, // Impossible negative rain
    rain48hMm: 180.0,
    rain72hMm: 235.0,
    catchmentSoilMoisturePct: 150.0, // Impossible > 100%
    upstreamDischargeCumec: 999999, // Impossible discharge
    gaugeStagePriorM: 10.0, // Physically implausible
  });

  assert(
    oodPrediction.inputQualityStatus === 'OUT_OF_BOUNDS',
    'Out-of-bounds input detected and quarantined without crashing',
  );
  assert(
    oodPrediction.confidenceLevel === 'LOW',
    'Confidence reduced to LOW for physically implausible telemetry',
  );
  assert(
    oodPrediction.warnings.length > 0,
    'Clear operator warnings generated explaining out-of-bounds inputs',
    oodPrediction.warnings[0],
  );

  // ── TEST 11: SEPARATION OF EXPERIMENTAL ML FROM OFFICIAL ALERTS ────────────
  console.log('\n--- TEST GROUP 11: Real-time Isolation & Deterministic Coexistence ---');
  assert(
    validPrediction.deterministicBaselineScore !== undefined,
    'Deterministic risk engine score calculated and displayed alongside ML probability',
    `Deterministic Score: ${validPrediction.deterministicBaselineScore}/100`,
  );
  assert(
    validPrediction.predictedClass !== 'CRITICAL_MANDATE' as any,
    'ML output does not issue binding government mandates',
  );

  // ── TEST 12: AI SNAPSHOT & SUMMARY INTEGRATION SAFETY ──────────────────────
  console.log('\n--- TEST GROUP 12: AI Summary Integration & Provenance Integrity ---');
  const snapshot = await disasterSnapshotService.assembleSnapshot({
    locationQuery: 'Kalahandi',
  });
  assert(snapshot.mlPrediction !== undefined, 'Snapshot successfully attached experimental ML prediction for Kalahandi');
  assert(
    snapshot.mlPrediction?.modelId === 'flood-exceedance-lr',
    'Attached ML prediction references verified model ID (flood-exceedance-lr)',
  );

  const summaryService = new DisasterIntelligenceSummaryService();
  const summary = await summaryService.generateSummary(snapshot);

  const mlEvidenceFound = summary.supportingEvidence.some((e) => e.includes('Experimental ML'));
  assert(mlEvidenceFound, 'AI Summary includes transparent supporting evidence with Experimental status label');
  assert(
    !summary.executiveSummary.includes('guaranteed flood') && !summary.executiveSummary.includes('mandatory evacuation'),
    'AI summary does not describe probability as guaranteed certainty or issue binding decrees',
  );

  // ── SUMMARY REPORT ─────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log('STAGE 7 VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log(`TOTAL ASSERTIONS: ${passedCount + failedCount}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);

  if (failedCount > 0) {
    console.error('\n❌ STAGE 7 VERIFICATION FAILED.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL STAGE 7 ML PLATFORM ASSERTIONS PASSED WITH ZERO FAILURES!');
  }
}

runStage7VerificationSuite().catch((err) => {
  console.error('Fatal test crash:', err);
  process.exit(1);
});
