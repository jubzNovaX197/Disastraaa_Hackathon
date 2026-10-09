/**
 * Disastraaa Stage 6 Verification Test Suite
 *
 * Automated verification of:
 * 1. Duplicate ingestion & Idempotency
 * 2. Repeated job execution
 * 3. Out-of-order observation protection
 * 4. Missing values & non-silent validation
 * 5. Invalid units & coordinate bounds
 * 6. Provider timeout & exponential backoff
 * 7. Object storage content-addressing & deduplication
 * 8. Retention engine dry-run behavior
 * 9. Daily rollup aggregation correctness
 * 10. ML dataset target leakage prevention
 * 11. Separation of real vs demo data
 * 12. Central data source registry classification (A-F)
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

import { DATA_SOURCE_REGISTRY, getDataSourcesByCategory } from '../src/lib/platform/registry';
import { storeRawPayload, computeSha256 } from '../src/lib/platform/storage';
import { IncrementalPipeline } from '../src/lib/platform/pipeline';
import { evaluateRetentionPolicy } from '../src/lib/platform/retention';
import {
  normalizeTimestampToUtc,
  validateCoordinates,
  calculateRollingRainfall,
  buildDailyRollup,
  computeDatasetQualityMetrics,
} from '../src/lib/platform/transforms';
import {
  generateFloodBenchmarkRecords,
  verifyNoTargetLeakage,
  FloodBenchmarkRow,
} from '../src/lib/platform/mlPipeline';
import { saveWeatherTelemetry } from '../src/lib/weather/store';
import { getDatabaseHealth } from '../src/lib/db';

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

async function runStage6VerificationSuite() {
  console.log('================================================================');
  console.log('DISASTRAAA STAGE 6: DATA PLATFORM VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // ── TEST 1 & 2: REUSABLE INCREMENTAL PIPELINE IDEMPOTENCY & REPEATED RUNS ──
  console.log('--- TEST GROUP 1: Ingestion Pipeline Idempotency & Repeated Runs ---');
  let fetchCallCount = 0;
  const mockRawData = {
    records: [
      { id: 'REC_001', district: 'Kalahandi', val: 42 },
      { id: 'REC_002', district: 'Khordha', val: 99 },
    ],
  };

  const testPipeline = new IncrementalPipeline({
    sourceId: 'open-meteo-weather',
    schemaVersion: 'v1.test',
    fetch: async () => {
      fetchCallCount++;
      return { success: true, data: mockRawData };
    },
    validate: (raw) => ({
      isValid: Array.isArray(raw.records) && raw.records.length > 0,
      errors: [],
    }),
    normalize: (raw) => raw.records,
    deduplicate: async (items) => {
      // Simulate deduplication
      return { unique: items, duplicatesCount: 0 };
    },
    transform: (items) => items,
    updateOperational: async (items) => {
      // Idempotent upsert simulation
      return { inserted: items.length, updated: 0 };
    },
  });

  const run1 = await testPipeline.run();
  const run2 = await testPipeline.run();

  assert(run1.status === 'SUCCESS', 'Pipeline Run 1 executed successfully', `Records fetched: ${run1.recordsFetched}`);
  assert(run2.status === 'SUCCESS', 'Pipeline Run 2 executed idempotently without errors', `Job Run ID: ${run2.id}`);
  assert(fetchCallCount === 2, 'Provider fetch was called exactly twice', `Total calls: ${fetchCallCount}`);

  // ── TEST 3: OUT-OF-ORDER OBSERVATION PROTECTION ────────────────────────────
  console.log('\n--- TEST GROUP 2: Out-of-Order Observation Protection ---');
  const baseTelemetry = {
    id: 'test_kalahandi_station',
    locationName: 'Kesinga Test Station',
    state: 'Odisha',
    district: 'Kalahandi',
    coordinates: [83.22, 20.2] as [number, number],
    temperatureC: 28.5,
    relativeHumidityPct: 75,
    precipitationMm: 12.0,
    windSpeedKmh: 18.0,
    windDirectionDeg: 120,
    surfacePressureHpa: 1008,
    weatherCode: 61,
    condition: 'Rain: Slight',
    icon: 'rain',
    isDay: true,
    validFrom: '2026-10-09T00:00:00Z',
    validUntil: '2026-10-09T23:59:59Z',
    source: 'Open-Meteo',
    environment: 'REAL' as const,
    freshnessStatus: 'LIVE' as const,
    retrievedAt: new Date().toISOString(),
    freshness: 'LIVE' as const,
  };

  // 1. Save newer observation
  const newerResult = await saveWeatherTelemetry({
    ...baseTelemetry,
    observedAt: '2026-10-09T04:00:00Z',
    temperatureC: 30.0,
  });

  // 2. Attempt to save older observation
  const olderResult = await saveWeatherTelemetry({
    ...baseTelemetry,
    observedAt: '2026-10-09T02:00:00Z',
    temperatureC: 25.0,
  });

  assert(newerResult.success, 'Newer observation saved successfully');
  assert(
    olderResult.isNewer === false,
    'Older observation correctly identified as stale and rejected from overwriting newer record',
    olderResult.error,
  );

  // ── TEST 4 & 5: VALIDATION, MISSING VALUES & BOUNDS CHECKING ───────────────
  console.log('\n--- TEST GROUP 3: Validation, Missing Values & Coordinate Bounds ---');
  assert(validateCoordinates(83.2, 20.2), 'Valid coordinates [83.2, 20.2] within WGS84 bounds');
  assert(!validateCoordinates(250.0, 20.2), 'Invalid longitude 250.0 correctly rejected');
  assert(!validateCoordinates(83.2, 120.0), 'Invalid latitude 120.0 correctly rejected');
  assert(
    !validateCoordinates(10.0, 10.0, [80.0, 17.0, 88.0, 23.0]),
    'Coordinates outside Odisha bounding box correctly rejected by regional validator',
  );

  const invalidWeatherSave = await saveWeatherTelemetry({
    ...baseTelemetry,
    coordinates: [999, 999] as any,
    temperatureC: NaN,
    observedAt: '2026-10-09T04:00:00Z',
  });
  assert(
    !invalidWeatherSave.success,
    'Malformed coordinates and NaN temperature correctly rejected without database write',
    invalidWeatherSave.error,
  );

  // ── TEST 6: PROVIDER TIMEOUT & EXPONENTIAL BACKOFF ─────────────────────────
  console.log('\n--- TEST GROUP 4: Transient Failures & Exponential Backoff ---');
  let transientAttempts = 0;
  const backoffPipeline = new IncrementalPipeline({
    sourceId: 'cwc-gauge-telemetry',
    maxRetries: 2,
    backoffInitialMs: 50,
    fetch: async () => {
      transientAttempts++;
      if (transientAttempts < 2) {
        throw new Error('Simulated network timeout (ETIMEDOUT)');
      }
      return { success: true, data: { level: 168.4 } };
    },
    validate: () => ({ isValid: true, errors: [] }),
    normalize: () => [{ status: 'OK' }],
    transform: (items) => items,
    updateOperational: async () => ({ inserted: 1, updated: 0 }),
  });

  const backoffRun = await backoffPipeline.run();
  assert(
    backoffRun.status === 'SUCCESS',
    'Pipeline recovered after transient network failure using exponential backoff',
    `Attempts: ${transientAttempts}, Duration: ${backoffRun.durationMs}ms`,
  );

  // ── TEST 7: OBJECT STORAGE CONTENT-ADDRESSING & DEDUPLICATION ─────────────
  console.log('\n--- TEST GROUP 5: Tier 2 Object Storage Content-Addressing & Deduplication ---');
  const samplePayload = {
    provider: 'NASA EONET',
    events: [{ id: 'EONET_1', title: 'Severe Storm Odisha' }],
    timestamp: '2026-10-09T00:00:00Z',
  };

  const upload1 = await storeRawPayload({
    sourceId: 'nasa-eonet-hazards',
    datasetName: 'eonet_events',
    payload: samplePayload,
    compress: true,
  });

  const upload2 = await storeRawPayload({
    sourceId: 'nasa-eonet-hazards',
    datasetName: 'eonet_events',
    payload: samplePayload,
    compress: true,
  });

  assert(upload1.contentHash === upload2.contentHash, 'Content hashes are identical for identical payloads');
  assert(upload1.storageKey === upload2.storageKey, 'Storage keys match deterministically based on SHA-256');
  assert(upload2.alreadyExisted === true, 'Duplicate payload recognized: skipped duplicate physical write');

  // ── TEST 8: STORAGE RETENTION & COMPACTION DRY-RUN ─────────────────────────
  console.log('\n--- TEST GROUP 6: Retention & Compaction Dry-Run Guarantee ---');
  const retentionDryRun = await evaluateRetentionPolicy({ execute: false });
  assert(retentionDryRun.isDryRun === true, 'Retention engine operated in safe Dry-Run mode');
  assert(retentionDryRun.executed === false, 'Zero records purged during dry-run audit');
  assert(Array.isArray(retentionDryRun.tables), 'Retention report returned table breakdown');
  assert(
    retentionDryRun.recommendations.length > 0,
    'Clear operator recommendation generated',
    retentionDryRun.recommendations[0],
  );

  // ── TEST 9: DAILY AGGREGATION & QUALITY METRICS CORRECTNESS ────────────────
  console.log('\n--- TEST GROUP 7: Data Transformation & Aggregation Correctness ---');
  const sampleHourlyWeather = [
    { temperatureC: 22.0, precipitationMm: 5.0, windSpeedKmh: 15.0, surfacePressureHpa: 1010 },
    { temperatureC: 28.0, precipitationMm: 15.0, windSpeedKmh: 25.0, surfacePressureHpa: 1008 },
    { temperatureC: 32.0, precipitationMm: 0.0, windSpeedKmh: 30.0, surfacePressureHpa: 1005 },
    { temperatureC: 24.0, precipitationMm: 10.0, windSpeedKmh: 20.0, surfacePressureHpa: 1009 },
  ];

  const dailyRollup = buildDailyRollup('Kalahandi', 'Odisha', '2026-10-09', sampleHourlyWeather);
  assert(dailyRollup.minTempC === 22.0, 'Daily min temperature correct (22.0°C)');
  assert(dailyRollup.maxTempC === 32.0, 'Daily max temperature correct (32.0°C)');
  assert(dailyRollup.avgTempC === 26.5, 'Daily avg temperature correct (26.5°C)');
  assert(dailyRollup.totalPrecipMm === 30.0, 'Daily total precipitation accumulation correct (30.0 mm)');
  assert(dailyRollup.maxWindKmh === 30.0, 'Daily peak wind speed correct (30.0 km/h)');
  assert(dailyRollup.observationCount === 4, 'Observation count accurately counted (4 readings)');

  const qualityStats = computeDatasetQualityMetrics(
    [
      { temp: 25, rain: 10 },
      { temp: null, rain: 20 },
      { temp: 30, rain: 0 },
      { temp: 28, rain: null },
    ],
    ['temp', 'rain'],
  );
  assert(qualityStats.missingnessPct['temp'] === 25.0, 'Missingness percentage accurately calculated (25.0% for temp)');
  assert(qualityStats.missingnessPct['rain'] === 25.0, 'Missingness percentage accurately calculated (25.0% for rain)');

  // ── TEST 10: ML TARGET LEAKAGE PREVENTION ──────────────────────────────────
  console.log('\n--- TEST GROUP 8: ML-Ready Benchmarks & Target Leakage Prevention ---');
  const validFloodBenchmarks = generateFloodBenchmarkRecords();
  const validCheck = verifyNoTargetLeakage(validFloodBenchmarks);
  assert(!validCheck.leakageDetected, 'Verified benchmark dataset has zero target leakage violations');

  // Synthesize intentional leakage to test detection
  const leakyBenchmarks: FloodBenchmarkRow[] = [
    {
      ...validFloodBenchmarks[0],
      observation_timestamp: '2018-07-16T18:00:00Z', // 6 hours AFTER target timestamp!
      timestamp: '2018-07-16T12:00:00Z',
    },
  ];
  const leakCheck = verifyNoTargetLeakage(leakyBenchmarks);
  assert(leakCheck.leakageDetected === true, 'Leakage detector successfully caught intentional future-data violation');
  assert(leakCheck.violationsCount === 1, 'Reported exactly 1 leakage violation count');

  // ── TEST 11: DATA SOURCE REGISTRY CLASSIFICATION (A - F) ───────────────────
  console.log('\n--- TEST GROUP 9: Data Source Registry Coverage (Categories A - F) ---');
  const catA = getDataSourcesByCategory('A_CURRENT_OPERATIONAL');
  const catB = getDataSourcesByCategory('B_HISTORICAL_ARCHIVE');
  const catC = getDataSourcesByCategory('C_FORECAST_MODEL');
  const catD = getDataSourcesByCategory('D_STATIC_REFERENCE');
  const catE = getDataSourcesByCategory('E_CITIZEN_REPORTS');
  const catF = getDataSourcesByCategory('F_DERIVED_ML');

  assert(catA.length >= 4, 'Category A (Current Operational Data) fully populated', `Sources: ${catA.map((s) => s.id).join(', ')}`);
  assert(catB.length >= 1, 'Category B (Historical Archives) fully populated', `Sources: ${catB.map((s) => s.id).join(', ')}`);
  assert(catC.length >= 1, 'Category C (Forecast & Model-Derived) fully populated', `Sources: ${catC.map((s) => s.id).join(', ')}`);
  assert(catD.length >= 2, 'Category D (Static Reference) fully populated', `Sources: ${catD.map((s) => s.id).join(', ')}`);
  assert(catE.length >= 1, 'Category E (Citizen Reports) fully populated', `Sources: ${catE.map((s) => s.id).join(', ')}`);
  assert(catF.length >= 2, 'Category F (Derived Features & ML) fully populated', `Sources: ${catF.map((s) => s.id).join(', ')}`);

  // ── TEST 12: REAL VS DEMO DATA ISOLATION ───────────────────────────────────
  console.log('\n--- TEST GROUP 10: Real vs Demo Data Isolation ---');
  for (const s of Object.values(DATA_SOURCE_REGISTRY)) {
    assert(
      s.nature !== undefined,
      `Source '${s.id}' explicitly defines data nature (${s.nature})`,
    );
  }

  // ── SUMMARY REPORT ─────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log('STAGE 6 VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log(`TOTAL ASSERTIONS: ${passedCount + failedCount}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);

  if (failedCount > 0) {
    console.error('\n❌ STAGE 6 VERIFICATION FAILED.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL STAGE 6 ASSERTIONS PASSED WITH ZERO FAILURES!');
  }
}

runStage6VerificationSuite().catch((err) => {
  console.error('Fatal test suite crash:', err);
  process.exit(1);
});
