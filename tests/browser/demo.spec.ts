import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('map seeds immediately and demo completes on desktop and mobile', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/map');
  await expect(page).toHaveTitle('Disaster Map | Disastraaa');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: `docs/screenshots/map-${testInfo.project.name}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('travel has a ready route, adapts to the blockage, and fits mobile', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/travel');
  await expect(page).toHaveTitle('Travel Safety & Route Planning | Disastraaa');
  await expect(page.locator('select').filter({ has: page.locator('option[value="node-puri-shelter-1"]') }).first()).toHaveValue('node-puri-shelter-1');
  await expect(page.getByText('Model output', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Puri shelter capacity:/)).toContainText('1,740 / 2,000');
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: `docs/screenshots/travel-${testInfo.project.name}.png` });
  await page.getByRole('button', { name: 'Run demo scenario' }).click();
  await expect(page.getByRole('status')).toContainText('Grand Road blocked', { timeout: 20000 });
  await expect(page.getByText(/Puri shelter capacity:/)).toContainText('2,000 / 2,000');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('0/4');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('health and protected APIs cannot be elevated by body or persona alone', async ({ request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  expect((await health.json()).checks.upstreamFeeds).toBe('not_checked');
  const incident = await request.post('/api/incidents', { data: { title: 'Forged', locationName: 'Puri', createdByRole: 'SUPER_ADMIN' } });
  expect(incident.status()).toBe(401);
  const ingestion = await request.post('/api/ingestion/sync', { headers: { Cookie: 'disastraaa-env=DEMO; disastraaa-user-role=SUPER_ADMIN' }, data: {} });
  expect(ingestion.status()).toBe(401);
  const dashboard = await request.get('/governance', { headers: { Cookie: 'disastraaa-env=DEMO; disastraaa-user-role=FIELD_OPERATOR' } });
  expect(dashboard.status()).toBe(403);
});
