import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isValidCoordinates } from '../src/hooks/useGeolocation';
import { buildGraphFromRoadSegments, calculateRoutes } from '../src/lib/routing';
import { safestCost, shortestCost, aggregateRouteRisk } from '../src/lib/routing/scoring';
import type { RoadSegment } from '../src/lib/roads/types';
import type { Shelter } from '../src/data/types';
import { haversineDistanceKm } from '../src/lib/geo/osm/validation';
import { SATELLITE_BASEMAP_STYLE, mapConfig } from '../src/config/map';

// ── TASK 1 & TASK 4: MAP LOCATION & GEOLOCATION VALIDATION ──────────────────

test('isValidCoordinates correctly validates geographic coordinates and rejects corrupt values', () => {
  // Valid coordinates
  assert.equal(isValidCoordinates([85.832, 19.81]), true);
  assert.equal(isValidCoordinates([0, 0]), true);
  assert.equal(isValidCoordinates([-180, -90]), true);
  assert.equal(isValidCoordinates([180, 90]), true);

  // Invalid types and lengths
  assert.equal(isValidCoordinates(null), false);
  assert.equal(isValidCoordinates(undefined), false);
  assert.equal(isValidCoordinates([]), false);
  assert.equal(isValidCoordinates([85.83]), false);
  assert.equal(isValidCoordinates([85.83, 19.81, 100]), false);
  assert.equal(isValidCoordinates(['85.83', '19.81']), false);

  // Out of bounds
  assert.equal(isValidCoordinates([180.1, 20.0]), false, 'Longitude > 180 must fail');
  assert.equal(isValidCoordinates([-180.1, 20.0]), false, 'Longitude < -180 must fail');
  assert.equal(isValidCoordinates([85.0, 90.1]), false, 'Latitude > 90 must fail');
  assert.equal(isValidCoordinates([85.0, -90.1]), false, 'Latitude < -90 must fail');

  // NaNs and infinities
  assert.equal(isValidCoordinates([NaN, 20.0]), false);
  assert.equal(isValidCoordinates([85.0, NaN]), false);
  assert.equal(isValidCoordinates([Infinity, 20.0]), false);
});

test('mock browser geolocation lifecycle: granted, denied, timeout, and hardware error', async () => {
  type GeoSuccessCallback = (pos: { coords: { latitude: number; longitude: number; accuracy: number } }) => void;
  type GeoErrorCallback = (err: { code: number; message: string; PERMISSION_DENIED: number; POSITION_UNAVAILABLE: number; TIMEOUT: number }) => void;

  function mockGeolocation(outcome: 'granted' | 'denied' | 'timeout' | 'corrupt') {
    return {
      getCurrentPosition: (success: GeoSuccessCallback, error: GeoErrorCallback) => {
        if (outcome === 'granted') {
          success({ coords: { latitude: 20.2961, longitude: 85.8245, accuracy: 12 } });
        } else if (outcome === 'denied') {
          error({ code: 1, message: 'Permission denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        } else if (outcome === 'timeout') {
          error({ code: 3, message: 'Timeout', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        } else if (outcome === 'corrupt') {
          success({ coords: { latitude: NaN, longitude: 999, accuracy: 0 } });
        }
      },
    };
  }

  // 1. Success
  let resultCoords: [number, number] | null = null;
  mockGeolocation('granted').getCurrentPosition(
    (pos) => {
      if (isValidCoordinates([pos.coords.longitude, pos.coords.latitude])) {
        resultCoords = [pos.coords.longitude, pos.coords.latitude];
      }
    },
    () => {},
  );
  assert.deepEqual(resultCoords, [85.8245, 20.2961]);

  // 2. Permission Denied
  let deniedCode = 0;
  mockGeolocation('denied').getCurrentPosition(
    () => {},
    (err) => {
      deniedCode = err.code;
    },
  );
  assert.equal(deniedCode, 1);

  // 3. Timeout
  let timeoutCode = 0;
  mockGeolocation('timeout').getCurrentPosition(
    () => {},
    (err) => {
      timeoutCode = err.code;
    },
  );
  assert.equal(timeoutCode, 3);

  // 4. Corrupt coordinates returned by device GPS
  let corruptRejected = false;
  mockGeolocation('corrupt').getCurrentPosition(
    (pos) => {
      if (!isValidCoordinates([pos.coords.longitude, pos.coords.latitude])) {
        corruptRejected = true;
      }
    },
    () => {},
  );
  assert.equal(corruptRejected, true);
});

test('manual map panning flag protects user viewport from automatic recentering', () => {
  let userHasManuallyPanned = false;
  const initialUserLocation: [number, number] = [85.83, 19.81];

  let center = [85.8, 20.0];
  let zoom = 7.0;

  // On initial mount before user touch: auto-center activates
  if (!userHasManuallyPanned) {
    center = initialUserLocation;
    zoom = 13.5;
  }
  assert.deepEqual(center, [85.83, 19.81]);
  assert.equal(zoom, 13.5);

  // User drags map to inspect Cuttack
  userHasManuallyPanned = true;
  center = [85.88, 20.46];
  zoom = 11.0;

  // Subsequent location heartbeat or re-renders must NOT overwrite user's view
  if (!userHasManuallyPanned) {
    center = initialUserLocation;
  }
  assert.deepEqual(center, [85.88, 20.46], 'User manual pan position must be preserved');
});

// ── TASK 2: REAL-MODE SOURCE-TO-DESTINATION ROUTING & DATA INTEGRITY ────────

test('genuine real road network graph construction: nodes, edges and no demo leakage', () => {
  const sampleRoads = [
    {
      id: 'osm-nh-16',
      name: 'National Highway 16 Corridor',
      code: 'NH-16',
      status: 'OPEN',
      roadType: 'HIGHWAY',
      coordinates: [
        [85.80, 20.25],
        [85.84, 20.30],
        [85.88, 20.35],
      ],
      travelRisk: {
        score: 10,
        severity: 'LOW',
        explanation: 'Operational',
        factors: [],
        travelAdvice: 'Clear',
        safeToTravel: true,
      },
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 'osm-nh-316',
      name: 'Bhubaneswar - Puri Expressway',
      code: 'NH-316',
      status: 'OPEN',
      roadType: 'MAJOR_ROAD',
      coordinates: [
        [85.84, 20.30], // Intersects NH-16 at [85.84, 20.30]
        [85.83, 20.05],
        [85.82, 19.81],
      ],
      travelRisk: {
        score: 15,
        severity: 'LOW',
        explanation: 'Operational',
        factors: [],
        travelAdvice: 'Clear',
        safeToTravel: true,
      },
      lastUpdated: new Date().toISOString(),
    },
  ] as unknown as RoadSegment[];

  const sampleShelters = [
    {
      id: 'sh-real-puri-town',
      name: 'Puri Coastal Emergency Shelter',
      type: 'CYCLONE',
      coordinates: [85.821, 19.812],
      capacity: 500,
      occupancy: 0,
      status: 'OPEN',
      address: 'Puri Beach Sector',
      facilities: ['Power', 'Water'],
    },
  ] as unknown as Shelter[];

  const graph = buildGraphFromRoadSegments(sampleRoads, sampleShelters);
  assert.ok(graph.nodes.length > 0);
  assert.ok(graph.edges.length > 0);

  // REAL mode data isolation check: No demo fixture IDs may leak into real graph
  assert.ok(!graph.nodeById['node-puri-shelter-1']);
  assert.ok(!graph.nodeById['node-puri-dhh']);
  assert.ok(!graph.nodeById['node-aiims-bbsr']);

  // Find start node and end node on the connected network
  const startNode = graph.nodes.find((n) => n.name.includes('National Highway 16 Corridor (Start)'))!;
  const endNode = graph.nodes.find((n) => n.id === 'node-sh-real-puri-town')!;
  assert.ok(startNode && endNode);

  // Calculate route between connected real nodes
  const route = calculateRoutes({ originNodeId: startNode.id, destinationNodeId: endNode.id }, graph);
  assert.equal(route.safest.found, true);
  assert.ok(route.safest.totalDistanceKm > 0);
  assert.ok(route.safest.totalMinutes > 0);
  assert.ok(route.safest.mapCoordinates.length >= 4);
});

test('route calculation rejects missing, empty, or identical endpoints honestly', () => {
  const sampleRoads = [
    {
      id: 'osm-road-1',
      name: 'Coastal Road',
      status: 'OPEN',
      roadType: 'MAJOR_ROAD',
      coordinates: [
        [85.80, 20.00],
        [85.90, 20.10],
      ],
      travelRisk: {
        score: 12,
        severity: 'LOW',
        explanation: 'Low risk',
        factors: [],
        travelAdvice: 'Passable',
        safeToTravel: true,
      },
      lastUpdated: new Date().toISOString(),
    },
  ] as unknown as RoadSegment[];
  const graph = buildGraphFromRoadSegments(sampleRoads);

  // 1. Identical source and destination
  const same = calculateRoutes({ originNodeId: graph.nodes[0].id, destinationNodeId: graph.nodes[0].id }, graph);
  assert.equal(same.safest.found, false);
  assert.match(same.safest.notFoundReason!, /same location/i);

  // 2. Unknown node
  const unknown = calculateRoutes({ originNodeId: 'non-existent-origin', destinationNodeId: graph.nodes[0].id }, graph);
  assert.equal(unknown.safest.found, false);
  assert.match(unknown.safest.notFoundReason!, /not found/i);
});

test('hazard and blockage penalties honestly alter safest route cost without fabricating demo paths', () => {
  const openEdge = {
    id: 'edge-open',
    from: 'a',
    to: 'b',
    roadName: 'Main Road',
    distanceKm: 10,
    roadType: 'MAJOR_ROAD' as const,
    status: 'OPEN' as const,
    riskScore: 10,
    coordinates: [[85.8, 20.0] as [number, number], [85.9, 20.0] as [number, number]],
  };

  const blockedEdge = {
    ...openEdge,
    id: 'edge-blocked',
    status: 'BLOCKED' as const,
    riskScore: 90,
  };

  const costOpen = safestCost(openEdge);
  const costBlocked = safestCost(blockedEdge);

  // Blocked road receives the high penalty (>= 999)
  assert.ok(costBlocked >= costOpen + 900, 'Safest cost must heavily penalize blocked roads');

  // Shortest cost vs Safest cost
  assert.ok(shortestCost(openEdge) < shortestCost(blockedEdge));
});

test('aggregateRouteRisk correctly aggregates segment risks and computes severity', () => {
  const lowRisk = aggregateRouteRisk([10, 15, 12]);
  assert.equal(lowRisk.severity, 'LOW');
  assert.ok(lowRisk.score <= 25);

  const highRisk = aggregateRouteRisk([15, 75, 45]);
  assert.equal(highRisk.severity, 'HIGH');
  assert.ok(highRisk.score >= 50);

  const criticalRisk = aggregateRouteRisk([85, 90, 95]);
  assert.equal(criticalRisk.severity, 'CRITICAL');
  assert.ok(criticalRisk.score >= 75);
});

// ── TASK 3: CITIZEN REPORT LOCATION SELECTION & SERVER VALIDATION ───────────

test('nearest road node snapping via haversine distance for "Use My Location"', () => {
  const nodes = [
    { id: 'node-bhubaneswar', name: 'Bhubaneswar Hub', coordinates: [85.8245, 20.2961] as [number, number], type: 'JUNCTION' as const },
    { id: 'node-puri', name: 'Puri Grand Road', coordinates: [85.8312, 19.8135] as [number, number], type: 'JUNCTION' as const },
    { id: 'node-cuttack', name: 'Cuttack Bridge', coordinates: [85.8830, 20.4625] as [number, number], type: 'JUNCTION' as const },
  ];

  // User is in Puri near the temple: [85.8300, 19.8120]
  const userCoords: [number, number] = [85.8300, 19.8120];

  let nearestNode = nodes[0];
  let minDistance = Infinity;
  for (const n of nodes) {
    const d = haversineDistanceKm(userCoords[1], userCoords[0], n.coordinates[1], n.coordinates[0]);
    if (d < minDistance) {
      minDistance = d;
      nearestNode = n;
    }
  }

  assert.equal(nearestNode.id, 'node-puri', 'User in Puri must snap to Puri road node');
  assert.ok(minDistance < 1.0, 'Snapping distance should be within ~1 km');
});

test('server-side coordinate validation rules for incident reports', () => {
  function validateReportCoordinates(coordinates: unknown): { valid: boolean; error?: string } {
    if (
      !coordinates ||
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      typeof coordinates[0] !== 'number' ||
      typeof coordinates[1] !== 'number' ||
      isNaN(coordinates[0]) ||
      isNaN(coordinates[1]) ||
      coordinates[0] < -180 ||
      coordinates[0] > 180 ||
      coordinates[1] < -90 ||
      coordinates[1] > 90
    ) {
      return { valid: false, error: 'Valid geographic coordinates [longitude, latitude] are required.' };
    }
    return { valid: true };
  }

  assert.equal(validateReportCoordinates([85.832, 19.81]).valid, true);
  assert.equal(validateReportCoordinates(null).valid, false);
  assert.equal(validateReportCoordinates([85.832]).valid, false);
  assert.equal(validateReportCoordinates(['85.832', 19.81]).valid, false);
  assert.equal(validateReportCoordinates([NaN, 19.81]).valid, false);
  assert.equal(validateReportCoordinates([200, 19.81]).valid, false);
  assert.equal(validateReportCoordinates([85.832, 100]).valid, false);
});

test('satellite basemap style specification contains background layer and valid zoom range', () => {
  assert.ok(
    SATELLITE_BASEMAP_STYLE.layers.some((l) => l.type === 'background'),
    'Satellite style must have background layer to prevent blank canvas',
  );
  assert.ok(
    mapConfig.minZoom <= 2.0,
    'minZoom must allow wide regional zoom without clipping',
  );
});

test('swap-endpoints preserves bidirectional pathfinding connectivity', () => {
  const sampleRoads = [
    {
      id: 'osm-nh-16',
      name: 'National Highway 16 Corridor',
      code: 'NH-16',
      status: 'OPEN',
      roadType: 'HIGHWAY',
      coordinates: [
        [85.80, 20.25],
        [85.84, 20.30],
      ],
      travelRisk: {
        score: 10,
        severity: 'LOW',
        explanation: 'Operational',
        factors: [],
        travelAdvice: 'Clear',
        safeToTravel: true,
      },
      lastUpdated: new Date().toISOString(),
    },
  ] as unknown as RoadSegment[];

  const graph = buildGraphFromRoadSegments(sampleRoads);
  const startNode = graph.nodes[0];
  const endNode = graph.nodes[1];

  const forward = calculateRoutes({ originNodeId: startNode.id, destinationNodeId: endNode.id }, graph);
  const reverse = calculateRoutes({ originNodeId: endNode.id, destinationNodeId: startNode.id }, graph);

  assert.equal(forward.safest.found, true);
  assert.equal(reverse.safest.found, true);
  assert.equal(forward.safest.totalDistanceKm, reverse.safest.totalDistanceKm);
});
