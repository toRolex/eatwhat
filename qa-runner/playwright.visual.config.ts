import { defineConfig } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');
const BASE_URL = process.env.QA_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: __dirname,
  timeout: 150_000,
  retries: process.env.CI ? 1 : 0,
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, timeout: 30_000 },
  },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: AUTH_FILE },
    },
    {
      name: 'a11y',
      testMatch: /a11y\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: AUTH_FILE },
    },
  ],
});
