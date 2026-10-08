/**
 * Automated Verification Script for Stage 1:
 * End-to-End Database Grounding & Client Feed Synchronization
 *
 * Verifies:
 * 1. Database Grounding (road_segments, shelters, weather_telemetry)
 * 2. API Serialization & Schema Conformity (/api/roads, /api/shelters, /api/weather, /api/alerts)
 * 3. Regional Discovery (Canonical Odisha Districts: Kalahandi, Khordha, Puri, Cuttack)
 * 4. Deterministic Aggregation with Genuine Data
 * 5. Truthful KPI States (No false critical badge on zero risk, truthful shelter capacity)
 * 6. DEMO Mode Isolation Preservation
 */

import fs from 'fs';
import path from 'path';

// Load .env.local if not already in process.env
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

import { osmRoadStore } from '../src/lib/roads/osmStore';
import { osmShelterStore } from '../src/lib/shelters/osmStore';
import { alertStore } from '../src/lib/alerts/alertStore';
import { realWeatherProvider } from '../src/lib/providers/real/realWeatherProvider';
import { aggregateCommandCenterData } from '../src/lib/commandCenter/aggregator';
import { getAvailableRealRegions, getAvailableRegions, CANONICAL_ODISHA_LOCATIONS } from '../src/lib/geo/regions';

async function runStage1Verification() {
  console.log('====================================================');
  console.log('STAGE 1 VERIFICATION: END-TO-END DATA GROUNDING');
  console.log('====================================================\n');

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

  // ── TEST 1: PostGIS Road Network Ingestion & Store ───────
  console.log('--- TEST 1: PostGIS Road Network Grounding ---');
  await osmRoadStore.initialize();
  const roadSegments = await osmRoadStore.getRoadSegments();
  assert(roadSegments.length >= 25, `osmRoadStore loaded ${roadSegments.length} real road segments (expected >= 25)`);

  const khordhaRoads = roadSegments.filter((r) => r.administrativeArea?.includes('Khordha'));
  assert(khordhaRoads.length >= 20, `Found ${khordhaRoads.length} segments in Khordha/Bhubaneswar corridor`);

  const hasValidGeometry = roadSegments.every((r) => Array.isArray(r.coordinates) && r.coordinates.length >= 2);
  assert(hasValidGeometry, 'Every road segment possesses valid PostGIS LineString coordinates');

  const totalLengthKm = roadSegments.reduce((sum, r) => sum + (r.lengthKm || 0), 0);
  assert(totalLengthKm > 10, `Total monitored road network length: ${totalLengthKm.toFixed(1)} km`);

  // ── TEST 2: PostGIS Shelter Registry Grounding ────────────
  console.log('\n--- TEST 2: PostGIS Shelter Registry Grounding ---');
  await osmShelterStore.initialize();
  const shelters = await osmShelterStore.getShelters();
  assert(shelters.length >= 4, `osmShelterStore loaded ${shelters.length} real shelters (expected >= 4)`);

  const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);
  assert(totalCapacity === 1450, `Total verified shelter capacity: ${totalCapacity} spaces (expected 1,450 across 4 centers)`);

  const kalinga = shelters.find((s) => s.id === 'osm-shelter-bbsr-kalinga');
  assert(Boolean(kalinga && kalinga.capacity === 500), 'Kalinga Stadium Disaster Assembly verified (500 capacity)');

  // ── TEST 3: PostGIS Weather Telemetry Grounding ───────────
  console.log('\n--- TEST 3: Weather Telemetry Grounding ---');
  const regionalWeather = await realWeatherProvider.getRegionalWeather();
  assert(regionalWeather.length >= 2, `Retrieved ${regionalWeather.length} live weather telemetry records from PostgreSQL`);

  const wx1 = regionalWeather[0];
  assert(
    Boolean(wx1 && typeof wx1.temperatureC === 'number' && wx1.freshnessStatus === 'LIVE'),
    `Weather telemetry record verified: ${wx1?.locationName} (${wx1?.temperatureC}°C, freshness: ${wx1?.freshnessStatus})`,
  );

  // ── TEST 4: Canonical Region Discovery ────────────────────
  console.log('\n--- TEST 4: Canonical Region Discovery ---');
  const canonicalRegions = CANONICAL_ODISHA_LOCATIONS;
  assert(canonicalRegions.length === 4, `4 canonical demonstration sectors defined: ${canonicalRegions.map((r) => r.district).join(', ')}`);

  const kalahandi = canonicalRegions.find((r) => r.id === 'odisha-kalahandi');
  assert(
    Boolean(kalahandi && kalahandi.population === 1576869 && kalahandi.populationSource.includes('Census of India 2011')),
    'Kalahandi documented population: 1,576,869 (Source: Census of India 2011)',
  );

  const realRegions = getAvailableRealRegions();
  assert(realRegions.length >= 4, `getAvailableRealRegions() successfully returns ${realRegions.length} operational regions in REAL mode`);
  assert(
    realRegions.some((r) => r.id === 'odisha-kalahandi') && realRegions.some((r) => r.id === 'odisha-khordha'),
    'Both Kalahandi and Khordha present in available real regions list',
  );

  // ── TEST 5: Truthful Operational Intelligence Aggregation ───
  console.log('\n--- TEST 5: Deterministic Aggregation with Genuine Data ---');
  const commandCenterData = aggregateCommandCenterData({
    environment: 'REAL',
    roads: roadSegments,
    shelters: shelters,
    weather: regionalWeather,
    alerts: [],
    reports: [],
  });

  assert(commandCenterData.priorityLocations.length >= 4, `Command Center evaluated ${commandCenterData.priorityLocations.length} priority locations`);

  const khordhaPriority = commandCenterData.priorityLocations.find((l) => l.district.includes('Khordha'));
  assert(Boolean(khordhaPriority), 'Khordha operations sector present in priority locations');

  if (khordhaPriority) {
    assert(khordhaPriority.shelterCapacity === 1450, `Khordha shelter capacity truthfully reflects DB: ${khordhaPriority.shelterCapacity} spaces`);
    assert(khordhaPriority.roadAccessibility === 'OPEN', `Khordha road accessibility truthfully evaluated as: ${khordhaPriority.roadAccessibility}`);
    assert(khordhaPriority.shelterPressureLabel.includes('AVAILABLE'), `Shelter pressure label: ${khordhaPriority.shelterPressureLabel}`);
    assert(khordhaPriority.impact.roadsKm === 0, `Disrupted roads km truthfully evaluated as: ${khordhaPriority.impact.roadsKm} km`);
  }

  // ── TEST 6: Truthful KPI Indicators & No False Criticals ──
  console.log('\n--- TEST 6: Truthful KPI Status Indicators ---');
  const kpis = commandCenterData.kpis;
  assert(
    kpis.risk.highestCurrentRisk.severity === 'LOW' || kpis.risk.highestCurrentRisk.score === 0,
    `Calm operational baseline: Peak Risk Score = ${kpis.risk.highestCurrentRisk.score}, Severity = ${kpis.risk.highestCurrentRisk.severity} (Never false CRITICAL)`,
  );

  assert(kpis.impact.populationExposed === 0, `Calm operational baseline: Population Exposed = ${kpis.impact.populationExposed} (No active hazard corridor)`);

  assert(
    kpis.response.blockedRoadsCount === 0,
    `Field response reflects true status: ${kpis.response.blockedRoadsCount} blocked roads on operational network`,
  );

  // ── TEST 7: DEMO Mode Isolation Preservation ─────────────
  console.log('\n--- TEST 7: DEMO Mode Isolation Preservation ---');
  const demoData = aggregateCommandCenterData({ environment: 'DEMO' });
  assert(demoData.priorityLocations.length > 0, `DEMO mode generates ${demoData.priorityLocations.length} simulated contingency locations`);
  assert(demoData.overview.highestRiskLocation.includes('Puri'), `DEMO highest risk location intact: ${demoData.overview.highestRiskLocation}`);
  assert(demoData.kpis.risk.highestCurrentRisk.score > 70, `DEMO simulated peak risk intact: ${demoData.kpis.risk.highestCurrentRisk.score}/100`);

  const demoRegions = getAvailableRegions('DEMO');
  assert(demoRegions.length > 0, `DEMO regions unaffected: ${demoRegions.length} scenario regions`);

  console.log('\n====================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage1Verification().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
