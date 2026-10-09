import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoScenario } from '../src/lib/simulation/demoScenario';
import { demoDataset } from '../src/data/demo';
import { calculateRoutes } from '../src/lib/routing/engine';
import { DEMO_EDGES, DEMO_NODES, NODE_BY_ID } from '../src/lib/routing/graph';
import { getFeedLabel } from '../src/lib/realtime/feedStatus';
import { canAccessDashboard } from '../src/lib/auth/accessPolicy';
import { parseEnvironmentFromCookie } from '../src/lib/env';
import { createSessionToken, verifySessionToken } from '../src/lib/auth/session';

test('fresh visitor gets simulation, explicit live choice is preserved', () => {
  assert.equal(parseEnvironmentFromCookie(''), 'DEMO');
  assert.equal(parseEnvironmentFromCookie('disastraaa-env=REAL'), 'REAL');
  assert.equal(parseEnvironmentFromCookie('disastraaa-env=%ZZ'), 'DEMO');
});

test('scenario escalates alerts, polygon, capacity and blockage without mutating fixtures', () => {
  const before = JSON.stringify(demoDataset);
  const stages = [0, 1, 2, 3, 4].map(step => buildDemoScenario(step, '2026-10-09T12:00:00Z'));
  assert.ok(stages[0].shelters.length && stages[0].roads.length && stages[0].alerts.length);
  assert.equal(stages[1].alerts.length, stages[0].alerts.length + 1);
  assert.notDeepEqual(stages[2].riskZones?.[0].coordinates, stages[0].riskZones?.[0].coordinates);
  assert.equal(stages[3].shelters.find(s => s.id === 'sh-puri-2')?.occupancy, 800);
  assert.equal(stages[4].roads.find(r => r.id === 'rd-puri-grand-road')?.status, 'BLOCKED');
  assert.equal(JSON.stringify(demoDataset), before);
  assert.deepEqual(buildDemoScenario(0, 'same'), buildDemoScenario(0, 'same'));
});

test('blocked Grand Road changes the seeded route to a passable alternative', () => {
  function route(step: number) {
    const roads = new Map(buildDemoScenario(step, 'now').roads.map(road => [road.id, road]));
    const edges = DEMO_EDGES.map(edge => {
      const road = roads.get(edge.roadSegmentId ?? '');
      return road ? { ...edge, status: road.status, riskScore: road.travelRisk.score } : edge;
    });
    return calculateRoutes({ originNodeId: 'node-puri-shelter-1', destinationNodeId: 'node-puri-dhh' }, { nodes: DEMO_NODES, nodeById: NODE_BY_ID, edges }).safest;
  }
  const before = route(0);
  const after = route(4);
  assert.ok(before.found && after.found);
  assert.notDeepEqual(before.segments.map(s => s.edgeId), after.segments.map(s => s.edgeId));
  assert.ok(after.segments.every(s => !s.isBlocked));
});

test('loading, unavailable and no received alerts are distinct states', () => {
  assert.equal(getFeedLabel('REAL', 'updating', 0), 'Loading feed');
  assert.equal(getFeedLabel('REAL', 'offline', 0), 'Feed unavailable');
  assert.equal(getFeedLabel('REAL', 'connected', 0), 'No active alerts in received feed');
  assert.match(getFeedLabel('REAL', 'delayed', 0), /degraded/);
  assert.equal(getFeedLabel('DEMO', 'connected', 0), 'Simulated scenario');
});

test('server policy restricts citizen and field operator dashboard access', () => {
  assert.equal(canAccessDashboard('CITIZEN', '/dashboard'), false);
  assert.equal(canAccessDashboard('FIELD_OPERATOR', '/governance'), false);
  assert.equal(canAccessDashboard('STATE_AUTHORITY', '/analytics'), false);
  assert.equal(canAccessDashboard('SUPER_ADMIN', '/governance'), true);
});

test('signed sessions reject tampering and unknown roles', async () => {
  process.env.AUTH_SECRET = 'test-only-random-secret-for-signature-tests-2026';
  const token = await createSessionToken({ uid: 'test', name: 'Test', email: 'test@example.com', role: 'REGISTERED_USER' });
  assert.equal((await verifySessionToken(token))?.role, 'REGISTERED_USER');
  assert.equal(await verifySessionToken(token + 'invalid'), null);
  assert.equal(await verifySessionToken('forged.token'), null);
});
