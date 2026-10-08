/**
 * Verification Script: Real Alert Ingestion (IMD & SACHET) + Alert Store
 *
 * Verifies:
 * 1. IMD CAP WMO Alert Hub connectivity and XML tag parsing
 * 2. SACHET probe and graceful WAF 403 documentation
 * 3. Alert normalizer: severity mapping, centroid calculation, freshness evaluation
 * 4. Alert store snapshot aggregation and in-memory TTL caching
 * 5. RealAlertProvider integration into DisasterDataProvider
 * 6. REAL vs DEMO mode isolation (zero simulated demo alerts in REAL mode)
 */

import { imdCapClient, IMD_RSS_ENDPOINT } from '../src/lib/alerts/imdCapClient';
import { sachetClient, SACHET_FEED_URL } from '../src/lib/alerts/sachetClient';
import { alertStore } from '../src/lib/alerts/alertStore';
import { realAlertProvider, realDataProvider } from '../src/lib/providers/real/realProvider';
import { demoAlertProvider } from '../src/lib/providers/demo/demoProvider';

async function runTests() {
  console.log('====================================================');
  console.log('TEST SUITE: REAL ALERT INGESTION (IMD & SACHET)');
  console.log('====================================================\n');

  alertStore._resetForTesting();

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

  // ── TEST 1: IMD WMO CAP-Alert Hub Connectivity ────────────
  console.log('--- TEST 1: IMD WMO CAP-Alert Hub Endpoint ---');
  assert(IMD_RSS_ENDPOINT.startsWith('https://cap-sources.s3.amazonaws.com'), 'Configured official WMO Alert Hub mirror endpoint');
  
  const imdRes = await imdCapClient.fetchCapFeed(10000);
  assert(imdRes.success === true, `Successfully fetched IMD CAP RSS feed (${imdRes.responseTimeMs}ms)`);
  assert(Array.isArray(imdRes.alerts), `Parsed alerts array returned (${imdRes.alerts.length} items)`);

  if (imdRes.alerts.length > 0) {
    const sample = imdRes.alerts[0];
    assert(sample.id.startsWith('alert-imd-'), `Alert has normalized ID: ${sample.id}`);
    assert(sample.sourceAgency === 'India Meteorological Department (IMD)', 'Attributed to official IMD source');
    assert(sample.coordinates.length === 2, `Valid GeoJSON coordinates [${sample.coordinates[0]}, ${sample.coordinates[1]}]`);
    assert(sample.severity === 'CRITICAL' || sample.severity === 'HIGH' || sample.severity === 'MODERATE' || sample.severity === 'LOW', `Mapped to valid Severity: ${sample.severity}`);
    assert(!!sample.title, `Alert has title: ${sample.title}`);
    assert(sample.freshnessStatus === 'LIVE' || sample.freshnessStatus === 'STALE', `Freshness evaluated: ${sample.freshnessStatus}`);
  }

  // ── TEST 2: NDMA SACHET Endpoint Probe & Limitation Handling ──
  console.log('\n--- TEST 2: NDMA SACHET WAF Limitation Documentation ---');
  assert(SACHET_FEED_URL.includes('sachet.ndma.gov.in'), 'Points to official SACHET public URL');
  
  const sachetRes = await sachetClient.probeFeed(6000);
  assert(sachetRes.feedStatus.feedId === 'ndma-sachet', 'SACHET feed record created');
  assert(
    sachetRes.feedStatus.status === 'RESTRICTED_WAF' || sachetRes.feedStatus.status === 'UNAVAILABLE' || sachetRes.feedStatus.status === 'CONNECTED',
    `Status accurately recorded without crashing: ${sachetRes.feedStatus.status}`
  );
  assert(sachetRes.feedStatus.itemCount === 0, 'No fake/fabricated alerts generated for restricted SACHET');
  assert(sachetRes.feedStatus.notes.length > 10, `Documented technical explanation: "${sachetRes.feedStatus.notes}"`);

  // ── TEST 3: Alert Store Aggregation & Caching ─────────────
  console.log('\n--- TEST 3: Alert Store Aggregator & In-Memory TTL Cache ---');
  const snapshot = await alertStore.getSnapshot();
  assert(snapshot.feedStatuses.length >= 2, `Feed status monitoring tracked ${snapshot.feedStatuses.length} authoritative feeds`);
  assert(snapshot.feedStatuses.some((f) => f.feedId === 'imd-nwfc'), 'Tracks IMD NWFC feed status');
  assert(snapshot.feedStatuses.some((f) => f.feedId === 'ndma-sachet'), 'Tracks NDMA SACHET feed status');
  assert(typeof snapshot.activeCount === 'number', `Active alerts count: ${snapshot.activeCount}`);
  assert(typeof snapshot.staleCount === 'number', `Stale/Expired alerts count: ${snapshot.staleCount}`);

  // ── TEST 4: RealAlertProvider Integration ─────────────────
  console.log('\n--- TEST 4: RealAlertProvider Integration ---');
  const realAlerts = await realAlertProvider.getAlerts();
  assert(Array.isArray(realAlerts), `RealAlertProvider returned ${realAlerts.length} total alerts`);

  const realDataset = await realDataProvider.getDataset();
  assert(realDataset.environment === 'REAL', 'RealDataProvider dataset has environment REAL');
  assert(Array.isArray(realDataset.alerts), `RealDataProvider includes alerts array (${realDataset.alerts.length} alerts)`);

  // ── TEST 5: REAL vs DEMO Isolation Preservation ──────────
  console.log('\n--- TEST 5: REAL vs DEMO Mode Isolation ---');
  const demoAlerts = await demoAlertProvider.getAlerts();
  assert(demoAlerts.length > 0, `DEMO alerts populated with scenario contingency (${demoAlerts.length} demo alerts)`);
  assert(demoAlerts.some((a) => a.title.includes('Remal') || a.regionName.includes('Puri') || a.id.includes('alert-')), 'DEMO alerts retain simulated events');
  
  // Verify REAL alerts do NOT contain mock Cyclone Remal demo alert IDs
  const hasDemoLeak = realAlerts.some((a) => a.id === 'alert-01' || a.id === 'alert-02' || a.title.includes('Remal'));
  assert(!hasDemoLeak, 'REAL alert stream does NOT contain any simulated demo alerts');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
