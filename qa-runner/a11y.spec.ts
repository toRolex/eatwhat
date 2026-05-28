import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const RULES = ['color-contrast', 'label', 'button-name', 'image-alt', 'link-name'];

const publicPages: Array<{ id: string; url: string }> = [
  { id: 'login',                  url: '/login' },
  { id: 'invite-bob',             url: '/invite/seed-inv-bob-dinner' },
  { id: 'invite-alice',           url: '/invite/seed-inv-alice-dinner' },
  { id: 'invite-invalid',         url: '/invite/this-slug-does-not-exist' },
  { id: 'invite-alice-prefs',     url: '/invite/seed-inv-alice-dinner/preferences' },
  { id: 'invite-alice-confirmed', url: '/invite/seed-inv-alice-dinner/confirmed' },
  { id: 'invite-david-rsvp',      url: '/invite/seed-inv-david-escape/rsvp' },
  { id: 'invite-carol-vote',      url: '/invite/seed-inv-carol-escape/vote' },
  { id: 'e-nobu',                 url: '/e/seed-team-dinner-nobu' },
  { id: 'e-carbone',              url: '/e/seed-birthday-dinner-carbone' },
];

const authPages: Array<{ id: string; url: string }> = [
  { id: 'dashboard',  url: '/dashboard' },
  { id: 'events-new', url: '/events/new' },
];

function makeA11yTests(pages: Array<{ id: string; url: string }>) {
  for (const p of pages) {
    test(p.id, async ({ page }) => {
      await page.goto(p.url, { waitUntil: 'load' });

      const finalPath = new URL(page.url()).pathname;
      expect(finalPath, `Unexpected redirect on ${p.id}: ${finalPath}`).toBe(p.url.split('?')[0]);

      const results = await new AxeBuilder({ page })
        .withRules(RULES)
        .analyze();

      expect(
        results.violations,
        `a11y violations on ${p.id}:\n` +
          results.violations
            .map(v => `  [${v.id}] ${v.help} — ${v.nodes.length} node(s)`)
            .join('\n'),
      ).toHaveLength(0);
    });
  }
}

test.describe('a11y / public', () => {
  makeA11yTests(publicPages);
});

test.describe('a11y / auth', () => {
  makeA11yTests(authPages);
});
