import { test, expect, type Page } from '@playwright/test';

// Public pages — no auth required.
const publicPages: Array<{ id: string; url: string }> = [
  { id: 'login',                  url: '/login' },
  { id: 'invite-bob',             url: '/invite/seed-inv-bob-dinner' },
  { id: 'invite-alice',           url: '/invite/seed-inv-alice-dinner' },
  { id: 'invite-invalid',         url: '/invite/this-slug-does-not-exist' },
  { id: 'invite-alice-prefs',     url: '/invite/seed-inv-alice-dinner/preferences' },
  { id: 'invite-alice-confirmed', url: '/invite/seed-inv-alice-dinner/confirmed' },
  { id: 'invite-david-rsvp',      url: '/invite/seed-inv-david-escape/rsvp' },
  // vote page requires EVENT_2 to be in 'deciding' status and proposals to exist (seeded separately)
  { id: 'invite-carol-vote',      url: '/invite/seed-inv-carol-escape/vote' },
  { id: 'e-nobu',                 url: '/e/seed-team-dinner-nobu' },
  // finalized event — tests the venue card + confirmed-state layout
  { id: 'e-carbone',              url: '/e/seed-birthday-dinner-carbone' },
];

// Auth-gated pages — rendered under (host) layout; storageState is injected by the visual project.
// The logged-in user is sarah.chen@example.com (USER_1_ID in the local Supabase instance),
// so the dashboard shows the event list with the three seed events.
const authPages: Array<{ id: string; url: string }> = [
  { id: 'dashboard',   url: '/dashboard' },
  { id: 'events-new',  url: '/events/new' },
];

const viewports = [
  { id: 'desktop', size: { width: 1280, height: 900 } },
  { id: 'mobile',  size: { width: 375,  height: 812 } },
] as const;

const themes = ['light', 'dark'] as const;

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  const dark = theme === 'dark';
  await page.addInitScript((d: boolean) => {
    if (d) {
      document.documentElement.dataset.theme = 'dark';
      document.body.classList.add('dark');
      localStorage.setItem('gp_tweaks', JSON.stringify({ darkMode: true }));
    } else {
      delete (document.documentElement as HTMLElement & { dataset: DOMStringMap }).dataset.theme;
      document.body.classList.remove('dark');
      localStorage.setItem('gp_tweaks', JSON.stringify({ darkMode: false }));
    }
  }, dark);
}

async function stabilize(page: Page): Promise<void> {
  // 'load' waits for subresources (fonts, images) then we give CSS entry animations time to finish.
  // The slowest staggered animation in the app is ~830ms (200ms delay + 450ms duration on login page).
  await page.waitForTimeout(900);
}

async function maskVolatile(page: Page): Promise<void> {
  const selectors = ['[data-testid="current-time"]', '[data-testid="rsvp-deadline"]'];
  for (const sel of selectors) {
    await page.locator(sel).first()
      .evaluate((el: HTMLElement) => (el.style.visibility = 'hidden'))
      .catch(() => {});
  }
}

function makeTests(pages: Array<{ id: string; url: string }>) {
  for (const theme of themes) {
    for (const vp of viewports) {
      test.describe(`${theme} / ${vp.id}`, () => {
        test.use({ viewport: vp.size });

        test.beforeEach(async ({ page }) => {
          // addInitScript fires on every subsequent navigation in this page context.
          await setTheme(page, theme);
        });

        for (const p of pages) {
          test(p.id, async ({ page }) => {
            await page.goto(p.url, { waitUntil: 'load' });

            // Assert we landed on the expected page — catches silent auth redirects.
            const finalPath = new URL(page.url()).pathname;
            expect(finalPath, `Unexpected redirect on ${p.id}: ended up at ${finalPath}`).toBe(p.url.split('?')[0]);

            await stabilize(page);
            await maskVolatile(page);

            await expect(page).toHaveScreenshot(`${p.id}__${vp.id}__${theme}.png`, { fullPage: true });
          });
        }
      });
    }
  }
}

// Public pages have no auth dependency — storageState is still injected (harmless for public routes).
makeTests(publicPages);

// Auth pages are intentionally kept in the same file to share the viewport/theme matrix.
// They depend on the setup project having run auth.setup.ts.
makeTests(authPages);
