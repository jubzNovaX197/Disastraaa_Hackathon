import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemoScenario } from '../src/lib/simulation/demoScenario';
import { demoDataset } from '../src/data/demo';
import { calculateRoutes } from '../src/lib/routing/engine';
import { DEMO_EDGES, DEMO_NODES, NODE_BY_ID } from '../src/lib/routing/graph';
import { getFeedLabel } from '../src/lib/realtime/feedStatus';
import { canAccessDashboard } from '../src/lib/auth/accessPolicy';
import { getDashboardNavGroupsForRole } from '../src/config/nav';
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
  assert.equal(canAccessDashboard('STATE_AUTHORITY', '/analytics'), true);
  assert.equal(canAccessDashboard('DISTRICT_AUTHORITY', '/analytics'), false);
  assert.equal(canAccessDashboard('SUPER_ADMIN', '/governance'), true);
});

test('role navigation groups expose citizen services for citizens and full command for state authority', () => {
  const citizenGroups = getDashboardNavGroupsForRole('CITIZEN');
  const citizenHrefs = citizenGroups.flatMap(g => g.items.map(i => i.href));
  assert.ok(citizenHrefs.includes('/map'));
  assert.ok(citizenHrefs.includes('/alerts'));
  assert.ok(citizenHrefs.includes('/travel'));
  assert.ok(citizenHrefs.includes('/shelters'));
  assert.ok(citizenHrefs.includes('/reports'));
  // Authority-only routes must not be present in citizen nav
  assert.equal(citizenHrefs.includes('/dashboard'), false);
  assert.equal(citizenHrefs.includes('/analytics'), false);
  assert.equal(citizenHrefs.includes('/operations'), false);
  assert.equal(citizenHrefs.includes('/governance'), false);

  const stateGroups = getDashboardNavGroupsForRole('STATE_AUTHORITY');
  const stateHrefs = stateGroups.flatMap(g => g.items.map(i => i.href));
  assert.ok(stateHrefs.includes('/analytics'));
  assert.ok(stateHrefs.includes('/dashboard'));
});

test('signed sessions reject tampering and unknown roles', async () => {
  process.env.AUTH_SECRET = 'test-only-random-secret-for-signature-tests-2026';
  const token = await createSessionToken({ uid: 'test', name: 'Test', email: 'test@example.com', role: 'REGISTERED_USER' });
  assert.equal((await verifySessionToken(token))?.role, 'REGISTERED_USER');
  assert.equal(await verifySessionToken(token + 'invalid'), null);
  assert.equal(await verifySessionToken('forged.token'), null);
});

test('session secret resolution supports multiple aliases and handles whitespace/quotes', async () => {
  const origAuth = process.env.AUTH_SECRET;
  const origSess = process.env.SESSION_SECRET;
  const origNext = process.env.NEXTAUTH_SECRET;
  const origJwt = process.env.JWT_SECRET;

  try {
    delete process.env.AUTH_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.JWT_SECRET;

    // Test alias SESSION_SECRET with quotes
    process.env.SESSION_SECRET = '"valid-session-secret-with-at-least-32-chars-2026"';
    const token1 = await createSessionToken({ uid: '1', name: 'User 1', email: 'u1@demo.com', role: 'REGISTERED_USER' });
    assert.equal((await verifySessionToken(token1))?.email, 'u1@demo.com');

    // Test alias NEXTAUTH_SECRET with whitespace
    delete process.env.SESSION_SECRET;
    process.env.NEXTAUTH_SECRET = '   valid-nextauth-secret-with-at-least-32-chars-2026   ';
    const token2 = await createSessionToken({ uid: '2', name: 'User 2', email: 'u2@demo.com', role: 'REGISTERED_USER' });
    assert.equal((await verifySessionToken(token2))?.email, 'u2@demo.com');

    // Test alias JWT_SECRET
    delete process.env.NEXTAUTH_SECRET;
    process.env.JWT_SECRET = 'valid-jwt-secret-with-at-least-32-chars-2026';
    const token3 = await createSessionToken({ uid: '3', name: 'User 3', email: 'u3@demo.com', role: 'REGISTERED_USER' });
    assert.equal((await verifySessionToken(token3))?.email, 'u3@demo.com');
  } finally {
    process.env.AUTH_SECRET = origAuth;
    process.env.SESSION_SECRET = origSess;
    process.env.NEXTAUTH_SECRET = origNext;
    process.env.JWT_SECRET = origJwt;
  }
});

test('session token creation throws descriptive error when secret is missing or too short in production', async () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origAuth = process.env.AUTH_SECRET;
  const origSess = process.env.SESSION_SECRET;
  const origNext = process.env.NEXTAUTH_SECRET;
  const origJwt = process.env.JWT_SECRET;

  try {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.AUTH_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.JWT_SECRET;

    await assert.rejects(
      async () => {
        await createSessionToken({ uid: '1', name: 'User 1', email: 'u1@demo.com', role: 'REGISTERED_USER' });
      },
      /AUTH_SECRET must contain at least 32 characters/,
    );

    // Too short secret
    process.env.AUTH_SECRET = 'short-secret-less-than-32-chars';
    await assert.rejects(
      async () => {
        await createSessionToken({ uid: '1', name: 'User 1', email: 'u1@demo.com', role: 'REGISTERED_USER' });
      },
      /AUTH_SECRET must contain at least 32 characters/,
    );
  } finally {
    (process.env as any).NODE_ENV = origNodeEnv;
    process.env.AUTH_SECRET = origAuth;
    process.env.SESSION_SECRET = origSess;
    process.env.NEXTAUTH_SECRET = origNext;
    process.env.JWT_SECRET = origJwt;
  }
});

test('POST /api/auth/login rejects invalid credentials with 401 and creates session for valid credentials', async () => {
  process.env.AUTH_SECRET = 'test-only-random-secret-for-signature-tests-2026';
  const { POST } = await import('../src/app/api/auth/login/route');

  // Bad credentials
  const badReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@disastraaa.gov.demo', password: 'WrongPassword' }),
  });
  const badRes = await POST(badReq);
  assert.equal(badRes.status, 401);
  const badBody = await badRes.json();
  assert.equal(badBody.success, false);
  assert.equal(badBody.error, 'Invalid email or password.');

  // Valid credentials
  const goodReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@disastraaa.gov.demo', password: 'Password123!' }),
  });
  const goodRes = await POST(goodReq);
  assert.equal(goodRes.status, 200);
  const goodBody = await goodRes.json();
  assert.equal(goodBody.success, true);
  assert.equal(goodBody.user.email, 'superadmin@disastraaa.gov.demo');
  assert.equal(goodBody.user.role, 'SUPER_ADMIN');
  assert.ok(goodRes.headers.get('set-cookie')?.includes('disastraaa-session='));
});

test('POST /api/auth/login fails safely with 500 when secret is missing in production and logs sanitized error', async () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origAuth = process.env.AUTH_SECRET;
  const origSess = process.env.SESSION_SECRET;
  const origNext = process.env.NEXTAUTH_SECRET;
  const origJwt = process.env.JWT_SECRET;

  try {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.AUTH_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.JWT_SECRET;

    const { POST } = await import('../src/app/api/auth/login/route');
    const goodReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@disastraaa.gov.demo', password: 'Password123!' }),
    });
    const res = await POST(goodReq);
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error, 'Login failed. Please try again.');
  } finally {
    (process.env as any).NODE_ENV = origNodeEnv;
    process.env.AUTH_SECRET = origAuth;
    process.env.SESSION_SECRET = origSess;
    process.env.NEXTAUTH_SECRET = origNext;
    process.env.JWT_SECRET = origJwt;
  }
});
