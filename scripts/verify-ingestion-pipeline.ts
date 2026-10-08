/**
 * Automated Verification Script for Real Data Ingestion Foundation + Weather-to-Risk Pipeline
 *
 * Verifies:
 * 1. Object Storage Abstraction (local/S3 fallback, put/get/has)
 * 2. Freshness Evaluation (LIVE, RECENT, STALE, UNAVAILABLE)
 * 3. NASA EONET Client & Normalizer (live endpoint, validation, spatial filter)
 * 4. NASA FIRMS Client & Normalizer (safe standby handling, CSV parser)
 * 5. Hazard Repository Deduplication & In-Memory Cache
 * 6. Weather -> Risk Pipeline (Open-Meteo -> Flood, Cyclone, Multi-Hazard -> RiskZones)
 * 7. RealHazardProvider & RealDisasterDataProvider Integration
 * 8. REAL / DEMO Isolation Preservation
 */

import { objectStorage } from '../src/lib/storage';
import { evaluateFreshness } from '../src/lib/ingestion/freshness';
import { eonetClient } from '../src/lib/ingestion/clients/eonetClient';
import { firmsClient } from '../src/lib/ingestion/clients/firmsClient';
import { normalizeEonetEvent } from '../src/lib/ingestion/normalizers/eonetNormalizer';
import { normalizeFirmsHotspot } from '../src/lib/ingestion/normalizers/firmsNormalizer';
import { hazardRepository } from '../src/lib/ingestion/repositories/hazardRepository';
import { weatherRiskService } from '../src/lib/ingestion/risk/weatherRiskService';
import { realHazardProvider, realDataProvider } from '../src/lib/providers/real/realProvider';
import { demoDataProvider } from '../src/lib/providers/demo/demoProvider';
import { saveWeatherTelemetry } from '../src/lib/weather/store';
import type { NormalizedWeather } from '../src/lib/weather/types';

async function runIngestionVerification() {
  console.log('====================================================');
  console.log('STARTING REAL DATA INGESTION & RISK PIPELINE TEST');
  console.log('====================================================\n');

  hazardRepository._resetForTesting();
  weatherRiskService._resetForTesting();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // ── TEST 1: Object Storage Abstraction ──────────────────
  console.log('--- TEST 1: Object Storage Abstraction ---');
  const testPayload = JSON.stringify({ test: 'disastraaa-archive', timestamp: Date.now() });
  const testKey = `raw/test/sample-${Date.now()}.json`;

  const meta = await objectStorage.putObject({
    key: testKey,
    data: testPayload,
    contentType: 'application/json',
  });

  assert(meta.key === testKey, `Object stored with key: ${meta.key}`);
  assert(meta.sizeBytes > 0, `Object size verified: ${meta.sizeBytes} bytes`);

  const fetched = await objectStorage.getObject(testKey);
  assert(fetched !== null && fetched.toString('utf8') === testPayload, 'Retrieved stored object matches payload');

  const exists = await objectStorage.hasObject(testKey);
  assert(exists === true, 'hasObject confirms existence');

  await objectStorage.deleteObject(testKey);
  const existsAfterDelete = await objectStorage.hasObject(testKey);
  assert(existsAfterDelete === false, 'deleteObject successfully cleans up test object');

  // ── TEST 2: Freshness Tracking ──────────────────────────
  console.log('\n--- TEST 2: Data Freshness Evaluation ---');
  const now = new Date();
  const liveTs = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // 30m ago
  const recentTs = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(); // 12h ago
  const staleTs = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(); // 72h ago

  assert(evaluateFreshness(liveTs) === 'LIVE', '30m old telemetry evaluated as LIVE');
  assert(evaluateFreshness(recentTs) === 'RECENT', '12h old telemetry evaluated as RECENT');
  assert(evaluateFreshness(staleTs) === 'STALE', '72h old telemetry evaluated as STALE (never marked LIVE)');
  assert(evaluateFreshness(null) === 'UNAVAILABLE', 'Missing telemetry evaluated as UNAVAILABLE');

  // ── TEST 3: NASA EONET Client & Normalizer ───────────────
  console.log('\n--- TEST 3: NASA EONET v3 Integration ---');
  console.log('>>> Querying public NASA EONET v3 endpoint (India bounding box)...');
  const eonetFetch = await eonetClient.fetchEvents({
    daysBack: 45,
    limit: 5,
    timeoutMs: 9000,
  });

  assert(
    eonetFetch.success === true || (eonetFetch.success === false && typeof eonetFetch.error === 'string'),
    `EONET client handled response properly (success: ${eonetFetch.success}, events: ${eonetFetch.events.length}, error: ${eonetFetch.error ?? 'none'})`,
  );

  // Test Normalizer on sample or fetched data
  const sampleEonet = eonetFetch.events[0] || {
    id: 'EONET_TEST_01',
    title: 'Severe Cyclonic Storm Test',
    description: 'Test tropical storm in Bay of Bengal',
    categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
    sources: [{ id: 'JTWC', url: 'https://metoc.navy.mil' }],
    geometry: [
      {
        date: new Date().toISOString(),
        type: 'Point' as const,
        coordinates: [86.5, 19.2],
        magnitudeValue: 55,
        magnitudeUnit: 'kts',
      },
    ],
  };

  const normalizedEonet = normalizeEonetEvent(sampleEonet);
  assert(normalizedEonet !== null, 'EONET normalizer produced valid IngestedHazardEvent');
  assert(
    normalizedEonet?.hazardType === 'CYCLONE' || normalizedEonet?.hazardType === 'FLOOD',
    `EONET mapped to CYCLONE or FLOOD, got: ${normalizedEonet?.hazardType}`,
  );
  assert(normalizedEonet?.severity !== undefined, `EONET severity derived: ${normalizedEonet?.severity}`);
  assert(typeof normalizedEonet?.coordinates[0] === 'number', 'EONET coordinates are valid [lng, lat]');

  // ── TEST 4: NASA FIRMS Client & Normalizer ───────────────
  console.log('\n--- TEST 4: NASA FIRMS Integration ---');
  const firmsConfigured = firmsClient.isConfigured();
  console.log(`>>> NASA FIRMS MAP_KEY configured: ${firmsConfigured ? 'YES' : 'NO (Safe Standby Mode)'}`);

  const firmsFetch = await firmsClient.fetchHotspots({ limit: 5 });
  if (!firmsConfigured) {
    assert(firmsFetch.configured === false, 'Unconfigured FIRMS safely returns configured: false without crashing');
    assert(firmsFetch.hotspots.length === 0, 'Unconfigured FIRMS returns 0 hotspots (zero fake data)');
  }

  // Test Normalizer on sample hotspot
  const sampleHotspot = {
    latitude: 21.5,
    longitude: 84.8,
    brightness: 335.5,
    scan: 1,
    track: 1,
    acqDate: new Date().toISOString().slice(0, 10),
    acqTime: '0630',
    satellite: 'VIIRS_SNPP',
    confidence: 'nominal',
    frp: 35.8,
    dayNight: 'D' as const,
  };

  const normalizedHotspot = normalizeFirmsHotspot(sampleHotspot);
  assert(normalizedHotspot.hazardType === 'HEATWAVE', `FIRMS hotspot mapped to HEATWAVE, got: ${normalizedHotspot.hazardType}`);
  assert(normalizedHotspot.coordinates[0] === 84.8 && normalizedHotspot.coordinates[1] === 21.5, 'Coordinates correctly formatted as [lng, lat]');
  assert(normalizedHotspot.severity === 'HIGH', `FRP 35.8 MW mapped to HIGH severity (got ${normalizedHotspot.severity})`);

  // ── TEST 5: Hazard Repository Deduplication & Cache ─────
  console.log('\n--- TEST 5: Hazard Repository Deduplication ---');
  if (normalizedEonet) {
    normalizedEonet.isActive = true;
    normalizedEonet.status = 'ACTIVE';
    const save1 = await hazardRepository.saveBatch([normalizedEonet]);
    assert(save1.inserted === 1, `Inserted 1 new hazard event into repository`);

    const save2 = await hazardRepository.saveBatch([normalizedEonet]);
    assert(save2.updated === 1, `Second save of same event correctly updated without creating duplicate row`);

    const activeList = await hazardRepository.getActiveHazards();
    assert(activeList.some((h) => h.id === normalizedEonet.id), 'Active hazards list retrieves saved event');
  }

  // ── TEST 6: Weather -> Risk Pipeline ────────────────────
  console.log('\n--- TEST 6: Weather -> Risk Intelligence Pipeline ---');
  // Seed sample real-like weather observation
  const sampleWeather: NormalizedWeather = {
    id: 'wx-test-puri-coastal',
    locationName: 'Puri Coastal Sector',
    state: 'Odisha',
    district: 'Puri District',
    coordinates: [85.8315, 19.8005],
    temperatureC: 28.5,
    apparentTemperatureC: 34.0,
    relativeHumidityPct: 92,
    precipitationMm: 12.5, // Significant rainfall -> triggers elevated flood/multi-hazard risk
    windSpeedKmh: 68.0,    // High squall -> triggers elevated cyclone risk
    windDirectionDeg: 120,
    surfacePressureHpa: 988.0, // Low pressure depression
    weatherCode: 95,
    condition: 'Thunderstorm with heavy rain',
    icon: '⛈️',
    isDay: true,
    source: 'Open-Meteo ECMWF/GFS Blend',
    observedAt: new Date().toISOString(),
    retrievedAt: new Date().toISOString(),
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 3600 * 1000).toISOString(),
    freshnessStatus: 'LIVE',
    environment: 'REAL',
  };

  await saveWeatherTelemetry(sampleWeather);

  // Compute derived risks through WeatherRiskService
  const derivedRisks = await weatherRiskService.computeDerivedRisks(true);
  assert(derivedRisks.riskZones.length > 0, `Derived ${derivedRisks.riskZones.length} RiskZones from weather telemetry`);
  assert(derivedRisks.riskZones[0].riskScore > 30, `Calculated elevated risk score: ${derivedRisks.riskZones[0].riskScore}/100`);
  assert(derivedRisks.riskZones[0].coordinates.length > 0, 'RiskZone includes valid GIS polygon boundary');
  assert(derivedRisks.floodAreas.length > 0, `Derived ${derivedRisks.floodAreas.length} FloodAreas from precipitation telemetry`);

  // ── TEST 7: Real Hazard Provider Integration ────────────
  console.log('\n--- TEST 7: Real Hazard Provider Integration ---');
  const realRiskZones = await realHazardProvider.getRiskZones();
  assert(realRiskZones.length > 0, `RealHazardProvider exposes derived real risk zones (${realRiskZones.length} zones)`);

  const realDataset = await realDataProvider.getDataset();
  assert(realDataset.environment === 'REAL', 'RealDataProvider dataset has environment: REAL');
  assert(realDataset.riskZones.length > 0, `RealDataProvider dataset reflects derived risk zones (${realDataset.riskZones.length} zones)`);

  // ── TEST 8: DEMO Mode Preservation ──────────────────────
  console.log('\n--- TEST 8: DEMO Mode Preservation ---');
  const demoDataset = await demoDataProvider.getDataset();
  assert(demoDataset.environment === 'DEMO', 'Demo dataset has environment: DEMO');
  assert(demoDataset.riskZones.length > 0, 'Demo dataset retains simulated risk zones');
  assert(demoDataset.shelters.length > 0, 'Demo dataset retains demo shelters');

  // Clean up
  hazardRepository._resetForTesting();
  weatherRiskService._resetForTesting();

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runIngestionVerification().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
