import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

test('independent SSR and browser imports keep fixture timestamps and text identical', () => {
  function importFixture(clock: string, timezone: string) {
    return execFileSync(process.execPath, ['--import', 'tsx', '-e', `
      Date.now = () => Date.parse(${JSON.stringify(clock)});
      const { demoRoadSegments } = require('./src/data/demo/roads.ts');
      const { demoAlerts } = require('./src/data/demo/alerts.ts');
      const { formatTimestampIST, formatTimeIST } = require('./src/lib/utils.ts');
      console.log(JSON.stringify({
        roads: demoRoadSegments.map(road => ({
          updatedAt: road.lastUpdated,
          reviewedAt: road.authorityVerification.reviewedAt,
          text: road.authorityVerification.reviewedAt && formatTimestampIST(road.authorityVerification.reviewedAt),
        })),
        alerts: demoAlerts.map(alert => ({
          issuedAt: alert.issuedAt,
          expiresAt: alert.expiresAt,
          text: alert.expiresAt && formatTimeIST(alert.expiresAt),
        })),
      }));
    `], { encoding: 'utf8', env: { ...process.env, TZ: timezone } }).trim();
  }

  const server = importFixture('2026-10-09T10:00:01Z', 'UTC');
  const browser = importFixture('2026-10-10T03:00:03Z', 'America/New_York');
  assert.equal(server, browser);
  assert.match(server, /IST/);
});
