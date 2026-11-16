import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const channel = process.env.E2E_BROWSER_CHANNEL || undefined;

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: process.env.E2E_VIDEO === '0' ? 'off' : 'retain-on-failure',
    acceptDownloads: true,
    ...(channel ? { channel } : {}),
  },
});
