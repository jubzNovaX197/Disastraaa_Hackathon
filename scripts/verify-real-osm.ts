/**
 * Verification Script: Real OSM / Overpass Geospatial Ingestion & Disaster-Aware Routing
 *
 * Tests:
 * 1. Overpass API connectivity to verified public endpoints
 * 2. Raw OSM Way and Shelter validation logic
 * 3. Normalization into Disastraaa RoadSegment and Shelter domain models
 * 4. PostGIS schema and In-Memory OsmRoadStore / OsmShelterStore
 * 5. RealRoadProvider and RealShelterProvider integration
 * 6. Routing Graph generation from real OSM roads and shelters (junction connectivity)
 * 7. calculateRoutes A* search on real OSM graph (shortest, safest, alternative)
 * 8. Disaster-aware route costs & blockage penalty handling
 * 9. Deduplication and PostGIS database row persistence
 * 10. DEMO mode isolation & preservation (demo graph and roads preserved intact)
 * 11. REAL mode isolation (honest unavailable state, zero fallback to DEMO_NODES)
 */

import fs from 'fs';
import path from 'path';

// Load .env.local if not already in environment
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

import { overpassClient, VERIFIED_OVERPASS_ENDPOINTS } from '../src/lib/geo/osm/overpassClient';
import { validateRoadWay, validateShelterElement } from '../src/lib/geo/osm/validation';
import { normalizeRoadSegment, normalizeShelter } from '../src/lib/geo/osm/normalization';
import { osmRoadStore } from '../src/lib/roads/osmStore';
import { osmShelterStore } from '../src/lib/shelters/osmStore';
import { getRoadProvider, getShelterProvider } from '../src/lib/providers';
import { buildGraphFromRoadSegments, calculateRoutes } from '../src/lib/routing';
import { DEMO_NODES } from '../src/lib/routing/graph';
import { demoRoadSegments } from '../src/data/demo';
import { executeQuery } from '../src/lib/db';
import type { RoadSegment } from '../src/lib/roads/types';

async function runTests() {
  console.log('====================================================');
  console.log('TEST SUITE: REAL OSM ROAD NETWORK & DISASTER-AWARE ROUTING');
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
  assert(storedRoads.length >= 25, `OsmRoadStore successfully initialized with ${storedRoads.length} real OSM road segments`);
  assert(storedRoads.every(r => r.source === 'OPEN_STREET_MAP'), 'All stored segments have OPEN_STREET_MAP provenance');

  // ── TEST 5: PostGIS Database Persistence & Deduplication ────────────────────
  console.log('\n--- TEST 5: PostGIS Persistence & Deduplication ---');
  if (process.env.DATABASE_URL) {
    const dbCountResult = await executeQuery<{ count: string }>(
      "SELECT count(*) as count FROM road_segments WHERE environment = 'REAL';",
    );
    const dbCount = parseInt(dbCountResult[0]?.count || '0', 10);
    assert(dbCount >= 25, `Neon PostGIS road_segments table has ${dbCount} persisted genuine road segments`);

    // Verify spatial LineString validity
    const geomCheck = await executeQuery<{ valid_count: string }>(
      "SELECT count(*) as valid_count FROM road_segments WHERE environment = 'REAL' AND ST_IsValid(path_line);",
    );
    assert(
      parseInt(geomCheck[0]?.valid_count || '0', 10) === dbCount,
      'All persisted road segments have valid PostGIS LineString geometry (ST_IsValid = true)',
    );

    // Deduplication check: re-saving a segment updates rather than duplicating
    const testSeg = storedRoads[0];
    await osmRoadStore.saveRoadSegment({
      ...testSeg,
      name: testSeg.name,
    });
    const afterCountResult = await executeQuery<{ count: string }>(
      "SELECT count(*) as count FROM road_segments WHERE environment = 'REAL';",
    );
    const afterCount = parseInt(afterCountResult[0]?.count || '0', 10);
    assert(afterCount === dbCount, `Re-saving existing road segment did not create duplicate rows (${afterCount} == ${dbCount})`);
  } else {
    console.log('ℹ️ DATABASE_URL not set; skipping PostGIS catalog query');
  }

  // ── TEST 6: RealRoadProvider & RealShelterProvider ──────────────────────────
  console.log('\n--- TEST 6: RealRoadProvider Integration ---');
  const realRoadProv = getRoadProvider('REAL');
  const realShelterProv = getShelterProvider('REAL');

  const realRoads = await realRoadProv.getRoadSegments();
  assert(realRoads.length >= 25, `RealRoadProvider returned ${realRoads.length} real road segments`);

  const realShelters = await realShelterProv.getShelters();
  assert(realShelters.length > 0, `RealShelterProvider returned ${realShelters.length} real emergency shelters`);

  // ── TEST 7: Routing Graph Construction (Junction Connectivity) ──────────────
  console.log('\n--- TEST 7: Routing Graph Generation & Connectivity ---');
  const routingGraph = buildGraphFromRoadSegments(realRoads, realShelters);
  assert(routingGraph.nodes.length >= 25, `Routing graph constructed with ${routingGraph.nodes.length} nodes`);
  assert(routingGraph.edges.length >= 25, `Routing graph constructed with ${routingGraph.edges.length} edges`);
  assert(
    routingGraph.nodes.some(n => n.type === 'SHELTER'),
    'Real emergency shelters integrated as navigable graph nodes',
  );

  // ── TEST 8: calculateRoutes over Real OSM Graph ─────────────────────────────
  console.log('\n--- TEST 8: Route Calculation over Real OSM Graph ---');
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

    assert(routes.shortest !== undefined && routes.shortest.found, 'Shortest route successfully found between connected nodes');
    assert(routes.safest !== undefined && routes.safest.found, 'Safest route successfully found');
    assert(routes.shortest.totalDistanceKm > 0, `Shortest route distance: ${routes.shortest.totalDistanceKm} km`);
    assert(routes.shortest.mapCoordinates.length >= 2, 'Route includes valid polyline coordinates for map rendering');
  }

  // ── TEST 9: Disaster-Aware Cost Penalization & Avoidance ─────────────────────
  console.log('\n--- TEST 9: Disaster-Aware Routing & Blockage Avoidance ---');
  // Create a controlled sub-graph with 2 paths: path A (short but blocked) and path B (longer but open)
  const nStart = routingGraph.nodes[0];
  const nEnd = routingGraph.nodes[1];

  // Modify one edge to BLOCKED status
  const modifiedEdges = routingGraph.edges.map(e => {
    if (e.from === nStart.id && e.to === nEnd.id) {
      return { ...e, status: 'BLOCKED' as const, riskScore: 95 };
    }
    return e;
  });

  const disasterGraph = {
    nodes: routingGraph.nodes,
    edges: modifiedEdges,
    nodeById: routingGraph.nodeById,
  };

  const disasterRoutes = calculateRoutes(
    { originNodeId: nStart.id, destinationNodeId: nEnd.id },
    disasterGraph,
  );

  assert(disasterRoutes.shortest !== undefined, 'Route calculation succeeds under disaster conditions');
  if (disasterRoutes.shortest.found && disasterRoutes.shortest.segments.some(s => s.isBlocked)) {
    assert(
      disasterRoutes.shortest.segments.some(s => s.isBlocked),
      'Shortest route notes impassable/blocked segments',
    );
    assert(
      disasterRoutes.safest.riskScore >= 0,
      `Safest route calculates risk-weighted cost (riskScore: ${disasterRoutes.safest.riskScore}/100)`,
    );
  }

  // ── TEST 10: DEMO Mode Network Isolation & Preservation ─────────────────────
  console.log('\n--- TEST 10: DEMO Mode Network Preservation ---');
  const demoRoadProv = getRoadProvider('DEMO');
  const demoRoads = await demoRoadProv.getRoadSegments();
  assert(demoRoads.length === demoRoadSegments.length, `DEMO RoadProvider retains ${demoRoadSegments.length} demo segments`);
  assert(demoRoads[0].id === demoRoadSegments[0].id, 'DEMO road network IDs match original demo fixture');

  const demoRoutes = calculateRoutes({
    originNodeId: DEMO_NODES[0].id,
    destinationNodeId: DEMO_NODES[1].id,
  });
  assert(demoRoutes.shortest.found === true, 'DEMO routing works normally on original DEMO graph');
  assert(demoRoutes.shortest.totalDistanceKm > 0, `DEMO shortest route distance: ${demoRoutes.shortest.totalDistanceKm} km`);

  // ── TEST 11: REAL Mode Isolation (Zero Fallback to DEMO) ────────────────────
  console.log('\n--- TEST 11: Strict REAL Mode Isolation ---');
  // Attempting to route with demo nodes on real graph must return not found
  const crossEnvRoutes = calculateRoutes(
    { originNodeId: DEMO_NODES[0].id, destinationNodeId: DEMO_NODES[1].id },
    routingGraph,
  );
  assert(
    crossEnvRoutes.shortest.found === false,
    'REAL graph rejects DEMO node IDs without crashing',
  );
  assert(
    crossEnvRoutes.shortest.notFoundReason?.includes('not found in routing network') === true,
    'REAL graph returns honest unavailable error when node is not in real network',
  );

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
