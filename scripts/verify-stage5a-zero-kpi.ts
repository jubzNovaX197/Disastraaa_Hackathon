/**
 * STAGE 5A VERIFICATION: ZERO-KPI AUDIT & PROVENANCE INTEGRITY GATE
 *
 * Verifies:
 * 1. Genuine zero values remain zero (no fabricated disruption).
 * 2. Missing data is not silently converted into zero risk.
 * 3. Failed or standby providers do not produce false 'ALL CLEAR' states.
 * 4. Stale data is labelled appropriately with provenance indicators.
 * 5. Frontend KPI mappings use correct API fields and honest transparency.
 * 6. REAL mode never silently falls back to fabricated demo data.
 */

import assert from 'assert';
import { aggregateCommandCenterData } from '../src/lib/commandCenter/aggregator';
import { getCanonicalOdishaRegions, getAvailableRealRegions } from '../src/lib/geo/regions';
import { calculateFloodRisk } from '../src/lib/risk/flood';
import { calculateCycloneRisk } from '../src/lib/risk/cyclone';
import { computeFreshnessStatus } from '../src/lib/weather/normalizer';
import { osmRoadStore } from '../src/lib/roads/osmStore';

async function runStage5aVerification() {
  console.log('====================================================');
  console.log('STAGE 5A VERIFICATION: ZERO-KPI AUDIT & INTEGRITY GATE');
  console.log('====================================================\n');

  // ── TEST 1: Genuine zero values remain zero ───────────────────────────────
  console.log('--- TEST 1: Genuine Zero Values Preserved ---');
  await osmRoadStore.initialize();
  const dbRoads = await osmRoadStore.getRoadSegments();
  const canonicalRegions = getCanonicalOdishaRegions();
  const passableRoads = dbRoads.length > 0 ? dbRoads : [];

  const calmCc = aggregateCommandCenterData({
    environment: 'REAL',
    regions: canonicalRegions,
    roads: passableRoads,
    alerts: [],
    reports: [],
    shelters: [
      {
        id: 'sh-1',
        name: 'Kalinga Stadium Disaster Shelter',
        coordinates: [85.8245, 20.2961],
        status: 'OPEN',
        capacity: 500,
        occupancy: 0,
        address: 'Bhubaneswar, Khordha District, Odisha',
        hasMedical: true,
        hasFood: true,
        hasPower: true,
      },
    ],
  });

  assert.strictEqual(
    calmCc.kpis.response.blockedRoadsCount,
    0,
    'Genuine zero blocked roads remains exactly 0 (no fabricated obstructions)',
  );
  assert.strictEqual(
    calmCc.kpis.impact.affectedRoadsKm,
    0,
    'Genuine zero impacted road km remains exactly 0 km',
  );
  assert.strictEqual(
    calmCc.kpis.response.verifiedCitizenReportsCount,
    0,
    'Genuine zero citizen reports remains exactly 0 reports',
  );
  assert.strictEqual(
    calmCc.kpis.response.activeAlertsCount,
    0,
    'Genuine zero active alerts remains exactly 0 alerts',
  );
  console.log('✅ PASS: Genuine zeros faithfully remain 0 without artificial inflation.');

  // ── TEST 2: Missing data is not silently converted into zero risk ─────────
  console.log('\n--- TEST 2: Missing Data Honesty & Quality Penalties ---');
  const missingRainResult = calculateFloodRisk(
    {
      rainfallIntensityMmPerDay: NaN,
      riverLevelMetres: 0,
      elevationMetres: 18,
      distanceFromRiverKm: 3.0,
      exposedPopulation: 25000,
      historicalFloodFrequency: 1.5,
      infrastructureVulnerabilityIndex: 0.35,
    },
    true,
  );

  assert.notStrictEqual(
    missingRainResult.score,
    0,
    'Missing rainfall does not silently evaluate to zero risk',
  );
  assert.strictEqual(
    missingRainResult.qualityStatus,
    'INSUFFICIENT',
    'Missing critical input flags qualityStatus as INSUFFICIENT',
  );
  assert(
    missingRainResult.confidence < 0.5,
    `Missing critical input heavily penalizes confidence (got: ${missingRainResult.confidence})`,
  );
  assert(
    missingRainResult.notes?.some((n) => n.toLowerCase().includes('rainfall')),
    'Missing input is documented explicitly in result notes',
  );
  console.log('✅ PASS: Missing data flags quality penalties and explains limitations.');

  // ── TEST 3: Failed / Standby providers do not produce false ALL CLEAR ─────
  console.log('\n--- TEST 3: Standby States Do Not Produce False ALL CLEAR ---');
  const standbyCc = aggregateCommandCenterData({
    environment: 'REAL',
    // No regions, no feeds
  });

  assert.strictEqual(
    standbyCc.kpis.risk.highestCurrentRisk.zoneName,
    'None (Operational Feeds Standby)',
    "Standby state is explicitly labelled 'None (Operational Feeds Standby)'",
  );
  assert.notStrictEqual(
    standbyCc.kpis.risk.highestCurrentRisk.zoneName,
    'Puri Coastal Belt',
    'REAL mode never leaks DEMO Puri zone when operational feeds are in standby',
  );
  console.log('✅ PASS: Standby state does not falsely report all clear or leak demo zones.');

  // ── TEST 4: Stale data is labelled appropriately ──────────────────────────
  console.log('\n--- TEST 4: Data Freshness & Provenance Categorization ---');
  const freshObs = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15m ago
  const staleObs = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago

  assert.strictEqual(
    computeFreshnessStatus(freshObs),
    'LIVE',
    'Observation from 15 mins ago classified as LIVE',
  );
  assert.strictEqual(
    computeFreshnessStatus(staleObs),
    'STALE',
    'Observation from 25 hours ago classified as STALE',
  );
  console.log('✅ PASS: Atmospheric telemetry temporal freshness correctly enforced.');

  // ── TEST 5: Frontend KPI mappings use correct API fields & transparency ───
  console.log('\n--- TEST 5: Frontend KPI Mappings & Shelter Transparency ---');
  // Shelter occupancy vs registered capacity check
  const shelter = calmCc.shelterOperations.items[0];
  assert.strictEqual(shelter.capacity, 500, 'Shelter capacity accurately preserved: 500');
  assert.strictEqual(shelter.occupancy, 0, 'Shelter occupancy accurately preserved: 0');
  assert.strictEqual(
    calmCc.shelterOperations.totalCapacityGap,
    0,
    'Capacity gap is 0 when no deficit exists',
  );
  assert.strictEqual(
    calmCc.kpis.response.sheltersUnderPressureCount,
    0,
    'Shelters under pressure accurately evaluated as 0',
  );

  // Operational sector priorities check
  assert.strictEqual(
    calmCc.priorityLocations.length,
    4,
    'Command Center evaluated exactly 4 canonical operational demonstration sectors',
  );
  assert(
    calmCc.priorityLocations.every((l) => l.name && l.district && l.coordinates),
    'Every operational sector possesses valid name, district, and coordinates',
  );
  console.log('✅ PASS: KPI fields match correct API schemas and operational parameters.');

  // ── TEST 6: REAL mode never silently falls back to fabricated demo data ───
  console.log('\n--- TEST 6: Strict REAL vs DEMO Isolation ---');
  // In REAL mode, resource operations should be empty (no fabricated 18,500L water)
  assert.strictEqual(
    calmCc.resourceOperations.categories.length,
    0,
    'REAL mode resource operations has 0 categories (no fabricated warehouse stocks)',
  );

  // Demo dataset should have 9 locations, while real calm mode has canonical sectors
  const demoCc = aggregateCommandCenterData({ environment: 'DEMO' });
  assert.strictEqual(demoCc.priorityLocations.length, 9, 'DEMO mode retains 9 simulated locations');
  assert(
    demoCc.resourceOperations.categories.length > 0,
    'DEMO mode retains simulated resource categories for evaluators',
  );

  console.log('✅ PASS: REAL mode strictly protected from demo contamination.');

  console.log('\n====================================================');
  console.log('STAGE 5A INTEGRITY GATE COMPLETE: ALL ASSERTIONS PASSED');
  console.log('====================================================\n');
}

runStage5aVerification().catch((err) => {
  console.error('❌ Stage 5A Verification FAILED:', err);
  process.exit(1);
});
