/**
 * Automated Verification Script for Real vs Demo Isolation & Data-Driven Region System
 */

import { aggregateCommandCenterData } from '../src/lib/commandCenter/aggregator';
import { buildSituationAnalyticsData } from '../src/lib/analytics/engine';
import { runSimulation } from '../src/lib/simulation/engine';
import { DEFAULT_SCENARIO_CONFIG } from '../src/lib/simulation/presets';
import {
  getAvailableRealRegions,
  getAvailableRegions,
  getActiveRealHazardRegions,
  registerRealOperationalLocation,
  _resetRealLocationsRegistry,
} from '../src/lib/geo/regions';
import { saveReport, getAllReports, _resetRealReportsForTesting } from '../src/lib/reports/store';
import { saveIncident, getIncidents, _resetRealIncidentsForTesting } from '../src/lib/incidents/store';

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING REAL vs DEMO ISOLATION & REGION SYSTEM TEST');
  console.log('====================================================\n');

  // Reset any test stores
  _resetRealLocationsRegistry();
  _resetRealReportsForTesting();
  _resetRealIncidentsForTesting();

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

  // ── TEST 1: REAL Mode Clean Empty State (Command Center) ──
  console.log('--- TEST 1: REAL Mode Command Center Disinfection ---');
  const realCC = aggregateCommandCenterData({ environment: 'REAL' });
  assert(realCC.priorityLocations.length === 0, 'REAL Command Center priorityLocations has 0 items when no real data exists');
  assert(realCC.kpis.risk.highestCurrentRisk.score === 0, 'REAL Command Center highest risk score is 0');
  assert(
    realCC.kpis.risk.highestCurrentRisk.zoneName === 'None (Operational Feeds Standby)',
    `REAL Command Center zoneName is 'None (Operational Feeds Standby)', got: ${realCC.kpis.risk.highestCurrentRisk.zoneName}`,
  );
  assert(
    realCC.overview.highestRiskLocation === 'None (Operational Feeds Standby)',
    `REAL Command Center overview.highestRiskLocation is 'None (Operational Feeds Standby)', got: ${realCC.overview.highestRiskLocation}`,
  );
  assert(realCC.shelterOperations.totalShelters === 0, 'REAL Command Center shelters count is 0');
  assert(realCC.roadOperations.totalDisruptions === 0, 'REAL Command Center road disruptions count is 0');

  // ── TEST 2: REAL Mode Situation Analytics Clean State ──
  console.log('\n--- TEST 2: REAL Mode Situation Analytics Disinfection ---');
  const realAnalytics = buildSituationAnalyticsData(undefined, undefined, undefined, undefined, 'REAL');
  assert(realAnalytics.overviewKpis.activeHazardsCount === 0, `REAL Analytics activeHazardsCount is 0, got: ${realAnalytics.overviewKpis.activeHazardsCount}`);
  assert(realAnalytics.overviewKpis.highRiskAreasCount === 0, 'REAL Analytics highRiskAreasCount is 0');
  assert(realAnalytics.overviewKpis.populationExposed === 0, 'REAL Analytics populationExposed is 0');
  assert(realAnalytics.regionalRows.length === 0, `REAL Analytics regionalRows is empty, got: ${realAnalytics.regionalRows.length}`);
  assert(realAnalytics.trendTimeline.length === 0, `REAL Analytics trendTimeline is empty (no Cyclone Remal mock timeline), got: ${realAnalytics.trendTimeline.length}`);
  assert(realAnalytics.historicalComparison.matchedEventsCount === 0, 'REAL Analytics historical matchedEventsCount is 0');

  // ── TEST 3: REAL Mode Response Simulator ──
  console.log('\n--- TEST 3: REAL Mode Response Simulator Data Separation ---');
  const realSim = runSimulation(DEFAULT_SCENARIO_CONFIG, 'REAL');
  assert(
    realSim.targetRegionName === 'No Operational Corridors Currently Affected',
    `REAL Simulator targetRegionName is 'No Operational Corridors Currently Affected', got: ${realSim.targetRegionName}`,
  );

  // ── TEST 4: DEMO Mode Preservation ──
  console.log('\n--- TEST 4: DEMO Mode Preservation ---');
  const demoCC = aggregateCommandCenterData({ environment: 'DEMO' });
  assert(demoCC.priorityLocations.length > 0, `DEMO Command Center has populated locations (${demoCC.priorityLocations.length} locations)`);
  assert(demoCC.priorityLocations.some(l => l.name.includes('Puri')), 'DEMO Command Center retains Puri Coastal Belt');
  
  const demoAnalytics = buildSituationAnalyticsData(undefined, undefined, undefined, undefined, 'DEMO');
  assert(demoAnalytics.overviewKpis.activeHazardsCount > 0, 'DEMO Analytics has populated active hazards');
  assert(demoAnalytics.trendTimeline.length > 0, 'DEMO Analytics has populated scenario trend timeline');
  assert(demoAnalytics.historicalComparison.matchedEventsCount > 0, 'DEMO Analytics has matched historical events');

  const demoSim = runSimulation(DEFAULT_SCENARIO_CONFIG, 'DEMO');
  assert(
    demoSim.targetRegionName === 'All Operational Corridors (Statewide Multi-Zone)',
    `DEMO Simulator targetRegionName retains Statewide Multi-Zone, got: ${demoSim.targetRegionName}`,
  );

  // ── TEST 5: Data-Driven Region Ingestion Requirement ──
  console.log('\n--- TEST 5: Data-Driven Region System (Dynamic Discovery) ---');
  // Initially, REAL available regions should be empty
  const initialRealRegions = getAvailableRegions('REAL');
  assert(initialRealRegions.length === 0, `Initially 0 real regions in REAL mode, got: ${initialRealRegions.length}`);

  // Ingest Real Event 1: Odisha -> Bargarh
  console.log('>>> Ingesting real citizen report: Odisha -> Bargarh District...');
  saveReport({
    id: 'rep-real-bargarh-01',
    title: 'Flash flooding on Bargarh canal breach',
    description: 'Irrigation canal breached near Bargarh town, submerging arterial culvert.',
    address: 'Bargarh Main Canal, Bargarh District, Odisha',
    coordinates: [83.6176, 21.3331],
    reportType: 'FLOOD',
    hazardType: 'FLOOD',
    severity: 'HIGH',
    status: 'VERIFIED',
    reporter: { name: 'Field Surveyor', isAnonymous: false, role: 'FIELD_OFFICER' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evidence: [],
    administrativeArea: 'Bargarh District, Odisha',
    confirmCount: 4,
    type: 'FLOOD',
    communityConfirmations: { confirmedCount: 4, suspiciousCount: 0 },
    authorityVerification: { status: 'VERIFIED' },
    linkedIntelligence: {},
    preliminaryAnalysis: {
      confidence: 'HIGH_CONFIDENCE',
      score: 90,
      completenessScore: 85,
      evidenceScore: 80,
      riskProximityScore: 70,
      alertProximityScore: 75,
      urgency: 'HIGH',
      indicators: [],
      summary: 'Verified canal breach',
      potentialAlertTrigger: true,
      duplicateIndicator: false,
      analyzedAt: new Date().toISOString(),
    },
  } as any, 'REAL');

  // Verify Bargarh became immediately available in REAL regions
  const regionsAfterBargarh = getAvailableRegions('REAL');
  assert(regionsAfterBargarh.length === 1, `1 region now available in REAL mode, got: ${regionsAfterBargarh.length}`);
  assert(
    regionsAfterBargarh[0].district.toLowerCase().includes('bargarh'),
    `Bargarh District discovered! District: ${regionsAfterBargarh[0].district}, State: ${regionsAfterBargarh[0].state}`,
  );
  assert(
    regionsAfterBargarh[0].activeHazardCount === 1,
    `Bargarh active hazard count is 1, got: ${regionsAfterBargarh[0].activeHazardCount}`,
  );

  // Verify Command Center priority locations dynamically reflects Bargarh
  const ccAfterBargarh = aggregateCommandCenterData({ environment: 'REAL' });
  assert(ccAfterBargarh.priorityLocations.length === 1, `REAL Command Center now has 1 priority location (${ccAfterBargarh.priorityLocations[0].name})`);
  assert(
    ccAfterBargarh.priorityLocations[0].district.toLowerCase().includes('bargarh'),
    `Command Center priority location is Bargarh!`,
  );

  // Ingest Real Event 2: West Bengal -> Kolkata
  console.log('>>> Ingesting real incident: West Bengal -> Kolkata...');
  saveIncident({
    id: 'inc-real-kolkata-01',
    title: 'Severe Waterlogging - Park Street Kolkata',
    description: 'Underpass waterlogged 4.5 feet following localized cloudburst.',
    incidentType: 'FLOOD',
    hazardType: 'FLOOD',
    severity: 'CRITICAL',
    status: 'TRIAGED',
    locationName: 'Park Circus Underpass, Kolkata',
    coordinates: [88.3639, 22.5726],
    affectedArea: 'Kolkata District, West Bengal',
    source: 'SYSTEM_GENERATED',
    dataLabel: 'VERIFIED',
    createdBy: 'Automated Sensor Feed',
    createdByRole: 'STATE_AUTHORITY' as any,
    actions: [],
    timeline: [],
    auditLog: [],
    relatedAlertIds: [],
    relatedReportIds: [],
    relatedRoadIds: [],
    relatedShelterIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priority: { score: 85, level: 'CRITICAL', factors: [] },
    escalationLevel: 1,
  } as any, 'REAL');

  // Verify both Bargarh and Kolkata are now dynamically available
  const regionsAfterBoth = getAvailableRegions('REAL');
  assert(regionsAfterBoth.length === 2, `2 regions now available in REAL mode, got: ${regionsAfterBoth.length}`);
  const hasBargarh = regionsAfterBoth.some(r => r.district.toLowerCase().includes('bargarh'));
  const hasKolkata = regionsAfterBoth.some(r => r.district.toLowerCase().includes('kolkata'));
  assert(hasBargarh && hasKolkata, 'Both Odisha/Bargarh and West Bengal/Kolkata are dynamically available!');

  const activeHazardRegions = getActiveRealHazardRegions();
  assert(activeHazardRegions.length === 2, `Both regions registered active hazards, got: ${activeHazardRegions.length}`);

  // ── TEST 6: Authenticated User Navigation & Platform Integrity ──
  console.log('\n--- TEST 6: Authenticated Navigation & Sidebar Integrity ---');
  const { getDashboardNavGroupsForRole } = await import('../src/config/nav');
  const { ROLES } = await import('../src/types/roles');
  const { createSessionToken, verifySessionToken, AUTH_MARKER_COOKIE_NAME } = await import('../src/lib/auth/session');

  assert(AUTH_MARKER_COOKIE_NAME === 'disastraaa-logged-in', 'AUTH_MARKER_COOKIE_NAME is defined as disastraaa-logged-in');

  const stateGroups = getDashboardNavGroupsForRole(ROLES.STATE_AUTHORITY);
  const allStateItems = stateGroups.flatMap((g) => g.items);
  const hasLiveSituationMap = allStateItems.some((i) => i.label === 'Live Situation Map' && i.href === '/map');
  const hasExitToPublic = allStateItems.some((i) => i.label.toLowerCase().includes('exit to public'));
  
  assert(hasLiveSituationMap, 'State Authority sidebar has "Live Situation Map" in core platform navigation');
  assert(!hasExitToPublic, 'State Authority sidebar does NOT have "Exit to Public Map" item');

  // Verify National Authority and Super Admin also have Live Situation Map
  const nationalGroups = getDashboardNavGroupsForRole(ROLES.NATIONAL_AUTHORITY);
  const hasNationalLiveMap = nationalGroups.flatMap((g) => g.items).some((i) => i.label === 'Live Situation Map');
  assert(hasNationalLiveMap, 'National Authority sidebar has "Live Situation Map"');

  // Test real session creation & verification
  const testToken = await createSessionToken({
    uid: 'usr-test-1',
    name: 'Test Officer',
    email: 'officer@osdma.gov.demo',
    role: ROLES.STATE_AUTHORITY,
    department: 'OSDMA State Command',
    geographicScope: 'Odisha State',
  });
  const verifiedPayload = await verifySessionToken(testToken);
  assert(verifiedPayload !== null && verifiedPayload.email === 'officer@osdma.gov.demo', 'Real session token created and verified correctly');
  assert(verifiedPayload?.role === ROLES.STATE_AUTHORITY, 'Real session payload preserves authenticated role');

  // Clean up
  _resetRealLocationsRegistry();
  _resetRealReportsForTesting();
  _resetRealIncidentsForTesting();

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
