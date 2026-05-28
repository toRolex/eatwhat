import { test as setup, expect } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, '.auth/user.json');

setup('authenticate as seed host', async ({ page, baseURL }) => {
  const base = baseURL ?? 'http://localhost:3000';

  const res = await page.request.post(`${base}/api/dev/sign-in`, {
    data: { email: 'sarah.chen@example.com' },
  });
  expect(res.ok(), `dev/sign-in failed with status ${res.status()}`).toBeTruthy();

  const { action_link } = await res.json() as { action_link: string };
  await page.goto(action_link);
  await page.waitForURL('**/dashboard', { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
