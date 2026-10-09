import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  workers: 1,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'npm run start', url: 'http://localhost:3000/api/health', reuseExistingServer: !process.env.CI, timeout: 120000 },
});
