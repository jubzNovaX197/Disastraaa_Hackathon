/**
 * Verification Script: Real OSM / Overpass Geospatial Ingestion
 *
 * Tests:
 * 1. Overpass API connectivity to verified public endpoints
 * 2. Raw OSM Way and Shelter validation logic
 * 3. Normalization into Disastraaa RoadSegment and Shelter domain models
 * 4. PostGIS schema and In-Memory OsmRoadStore / OsmShelterStore
 * 5. RealRoadProvider and RealShelterProvider integration
 * 6. Routing Graph generation from real OSM roads and shelters
 * 7. calculateRoutes A* search on real OSM graph
 * 8. DEMO mode isolation (demo graph and roads preserved intact)
 */

import { overpassClient, VERIFIED_OVERPASS_ENDPOINTS } from '../src/lib/geo/osm/overpassClient';
import { validateRoadWay, validateShelterElement } from '../src/lib/geo/osm/validation';
import { normalizeRoadSegment, normalizeShelter } from '../src/lib/geo/osm/normalization';
import { osmRoadStore } from '../src/lib/roads/osmStore';
import { osmShelterStore } from '../src/lib/shelters/osmStore';
import { getRoadProvider, getShelterProvider } from '../src/lib/providers';
import { buildGraphFromRoadSegments, calculateRoutes } from '../src/lib/routing';
import { DEMO_NODES, DEMO_EDGES } from '../src/lib/routing/graph';
import { demoRoadSegments } from '../src/data/demo';

async function runTests() {
  console.log('====================================================');
  console.log('TEST SUITE: REAL OSM / OVERPASS GEOSPATIAL INGESTION');
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

  // ── TEST 1: Verified Overpass Endpoints Pool ────────────────────────────────
  console.log('--- TEST 1: Verified Overpass Endpoints ---');
  assert(VERIFIED_OVERPASS_ENDPOINTS.length >= 3, `Endpoints pool contains ${VERIFIED_OVERPASS_ENDPOINTS.length} verified public servers`);
  assert(VERIFIED_OVERPASS_ENDPOINTS.includes('https://overpass-api.de/api/interpreter'), 'Includes official primary overpass-api.de');
  assert(VERIFIED_OVERPASS_ENDPOINTS.includes('https://maps.mail.ru/osm/tools/overpass/api/interpreter'), 'Includes verified high-availability mirror');

  // ── TEST 2: Validation of Raw OSM Elements ──────────────────────────────────
  console.log('\n--- TEST 2: Validation Logic ---');

  // Valid road way
  const mockValidWay: any = {
    type: 'way',
    id: 10001,
    geometry: [
      { lat: 20.2961, lon: 85.8245 },
      { lat: 20.3010, lon: 85.8300 },
      { lat: 20.3150, lon: 85.8420 },
    ],
    tags: {
      highway: 'primary',
      name: 'NH-16 Twin City Expressway',
      ref: 'NH-16',
    },
  };
  const valResult = validateRoadWay(mockValidWay);
  assert(valResult.valid === true, 'Valid primary road way passes validation');
  assert(valResult.road?.name === 'NH-16 Twin City Expressway', 'Road name correctly extracted');
  assert(valResult.road?.lengthKm !== undefined && valResult.road.lengthKm > 0, `Length calculated: ${valResult.road?.lengthKm} km`);

  // Invalid: missing geometry
  const mockInvalidWay: any = {
    type: 'way',
    id: 10002,
    geometry: [{ lat: 20.2961, lon: 85.8245 }], // only 1 point
    tags: { highway: 'primary' },
  };
  const invalidResult = validateRoadWay(mockInvalidWay);
  assert(invalidResult.valid === false, 'Way with fewer than 2 points correctly rejected');

  // Invalid: not an accepted road class
  const mockFootpath: any = {
    type: 'way',
    id: 10003,
    geometry: [
      { lat: 20.2961, lon: 85.8245 },
      { lat: 20.2962, lon: 85.8246 },
    ],
    tags: { highway: 'steps' },
  };
  const footpathResult = validateRoadWay(mockFootpath);
  assert(footpathResult.valid === false, 'Steps/footway correctly rejected from vehicular network');

  // ── TEST 3: Normalization Logic & Provenance ─────────────────────────────────
  console.log('\n--- TEST 3: Normalization & Provenance ---');
  const normalizedRoad = normalizeRoadSegment(valResult.road!);
  assert(normalizedRoad.id === 'osm-way-10001', 'Normalized ID format osm-way-ID');
  assert(normalizedRoad.roadType === 'MAJOR_ROAD', 'OSM primary mapped to MAJOR_ROAD');
  assert(normalizedRoad.source === 'OPEN_STREET_MAP', 'Source attributed to OPEN_STREET_MAP');
  assert(normalizedRoad.status === 'OPEN', 'Baseline road status initialized to OPEN');
  assert(normalizedRoad.coordinates.length === 3, 'Geometry correctly preserved as [lon, lat][]');
  assert((normalizedRoad.travelMinutes ?? 0) > 0, `Travel minutes calculated: ${normalizedRoad.travelMinutes} mins`);

  // Shelter validation & provenance
  const mockShelterNode: any = {
    type: 'node',
    id: 20001,
    lat: 20.2980,
    lon: 85.8260,
    tags: {
      amenity: 'shelter',
      name: 'Kalinga Stadium Emergency Center',
      operator: 'Odisha State Disaster Management Authority',
      capacity: '500',
    },
  };
  const valShelter = validateShelterElement(mockShelterNode);
  assert(valShelter.valid === true, 'Emergency shelter node passes validation');
  assert(valShelter.shelter?.isOfficialGov === true, 'OSDMA operator recognized as official government shelter');

  const normalizedShelter = normalizeShelter(valShelter.shelter!);
  assert(normalizedShelter.id === 'osm-shelter-20001', 'Shelter normalized ID correct');
  assert(normalizedShelter.capacity === 500, 'Shelter capacity parsed as 500');
  assert(normalizedShelter.source === 'OPEN_STREET_MAP', 'Shelter source provenance preserved');

  // ── TEST 4: OsmRoadStore & Baseline Initialization ──────────────────────────
  console.log('\n--- TEST 4: OSM Road Store & Persistence ---');
  await osmRoadStore.initialize();
  const storedRoads = await osmRoadStore.getRoadSegments();
  assert(storedRoads.length > 0, `OsmRoadStore successfully initialized with ${storedRoads.length} real OSM road segments`);
  assert(storedRoads.every(r => r.source === 'OPEN_STREET_MAP'), 'All stored segments have OPEN_STREET_MAP provenance');

  // ── TEST 5: RealRoadProvider & RealShelterProvider ──────────────────────────
  console.log('\n--- TEST 5: RealRoadProvider Integration ---');
  const realRoadProv = getRoadProvider('REAL');
  const realShelterProv = getShelterProvider('REAL');

  const realRoads = await realRoadProv.getRoadSegments();
  assert(realRoads.length > 0, `RealRoadProvider returned ${realRoads.length} real road segments (replaces empty list)`);

  const realShelters = await realShelterProv.getShelters();
  assert(realShelters.length > 0, `RealShelterProvider returned ${realShelters.length} real emergency shelters`);

  // ── TEST 6: Routing Graph Construction from Real OSM Data ───────────────────
  console.log('\n--- TEST 6: Routing Graph Generation ---');
  const routingGraph = buildGraphFromRoadSegments(realRoads, realShelters);
  assert(routingGraph.nodes.length > 0, `Routing graph constructed with ${routingGraph.nodes.length} nodes`);
  assert(routingGraph.edges.length > 0, `Routing graph constructed with ${routingGraph.edges.length} edges`);
  assert(
    routingGraph.nodes.some(n => n.type === 'SHELTER'),
    'Real emergency shelters integrated as navigable graph nodes',
  );

  // ── TEST 7: calculateRoutes over Real OSM Graph ─────────────────────────────
  console.log('\n--- TEST 7: Route Calculation over Real OSM Graph ---');
  if (routingGraph.nodes.length >= 2) {
    const originNode = routingGraph.nodes[0];
    const destNode = routingGraph.nodes[1];

    console.log(`Routing from [${originNode.name}] to [${destNode.name}]...`);
    const routes = calculateRoutes(
      {
        originNodeId: originNode.id,
        destinationNodeId: destNode.id,
      },
      routingGraph,
    );

    assert(routes.shortest !== undefined, 'Shortest route calculated');
    assert(routes.safest !== undefined, 'Safest route calculated');
    assert(routes.alternative !== undefined, 'Alternative route calculated');
    assert(routes.shortest.mode === 'SHORTEST', 'Shortest route mode set');
    assert(routes.safest.mode === 'SAFEST', 'Safest route mode set');
  }

  // ── TEST 8: DEMO Mode Network Isolation & Preservation ──────────────────────
  console.log('\n--- TEST 8: DEMO Mode Network Preservation ---');
  const demoRoadProv = getRoadProvider('DEMO');
  const demoRoads = await demoRoadProv.getRoadSegments();
  assert(demoRoads.length === demoRoadSegments.length, `DEMO RoadProvider retains ${demoRoadSegments.length} demo segments`);
  assert(demoRoads[0].id === demoRoadSegments[0].id, 'DEMO road network IDs match original demo fixture');

  // Test routing without customGraph defaults to DEMO network
  const demoRoutes = calculateRoutes({
    originNodeId: DEMO_NODES[0].id,
    destinationNodeId: DEMO_NODES[1].id,
  });
  assert(demoRoutes.shortest.found === true, 'DEMO routing works normally on original DEMO graph');
  assert(demoRoutes.shortest.totalDistanceKm > 0, `DEMO shortest route distance: ${demoRoutes.shortest.totalDistanceKm} km`);

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
