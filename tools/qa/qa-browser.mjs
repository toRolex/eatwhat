import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3000';
const OUT = path.join(process.cwd(), 'qa-screenshots');
fs.mkdirSync(OUT, { recursive: true });

const viewports = {
  'D-L': { width: 1280, height: 900 },
  'M-L': { width: 375, height: 812 },
};
const themes = ['light', 'dark'];

const pages = [
  { id: 'login', url: '/login' },
  { id: 'invite-bob', url: '/invite/seed-inv-bob-dinner' },
  { id: 'invite-alice', url: '/invite/seed-inv-alice-dinner' },
  { id: 'invite-invalid', url: '/invite/this-slug-does-not-exist' },
  { id: 'invite-alice-prefs', url: '/invite/seed-inv-alice-dinner/preferences' },
  { id: 'invite-alice-confirmed', url: '/invite/seed-inv-alice-dinner/confirmed' },
  { id: 'invite-dan-rsvp', url: '/invite/seed-inv-dan-escape/rsvp' },
  { id: 'e-nobu', url: '/e/seed-team-dinner-nobu' },
  { id: 'dashboard', url: '/dashboard' },
  { id: 'events-new', url: '/events/new' },
];

const results = [];
const consoleErrors = [];

async function setTheme(page, dark) {
  await page.evaluate((d) => {
    if (d) {
      document.documentElement.dataset.theme = 'dark';
      document.body.classList.add('dark');
      localStorage.setItem('gp_tweaks', JSON.stringify({ darkMode: true }));
    } else {
      delete document.documentElement.dataset.theme;
      document.body.classList.remove('dark');
      localStorage.setItem('gp_tweaks', JSON.stringify({ darkMode: false }));
    }
  }, dark);
}

async function capture(page, label, url) {
  const file = path.join(OUT, `${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const text = await page.locator('body').innerText().catch(() => '');
  const html = await page.content();
  results.push({
    label,
    url,
    file: path.basename(file),
    textSample: text.slice(0, 500).replace(/\s+/g, ' '),
    hasSupabaseErr: html.includes('Supabase') || text.includes('Supabase'),
    hasValidLink: /isn't valid|isnt valid|link isn't valid/i.test(text),
    hasGoing: /You're going|You\u2019re going/i.test(text),
    hasWaitingAI: /Waiting for AI recommendations/i.test(text),
    hasDateFlexible: /Date flexible/i.test(text),
    title: await page.title(),
  });
}

const browser = await chromium.launch({ headless: true });

for (const theme of themes) {
  const dark = theme === 'dark';
  for (const [vpKey, vp] of Object.entries(viewports)) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push({ vp: vpKey, theme, text: msg.text() });
    });
    await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await setTheme(page, dark);

    for (const p of pages) {
      const label = `${p.id}__${vpKey}-${theme === 'dark' ? 'D' : 'L'}`;
      try {
        const resp = await page.goto(BASE + p.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(800);
        await capture(page, label, p.url);
        results[results.length - 1].status = resp?.status();
        results[results.length - 1].finalUrl = page.url();
      } catch (e) {
        results.push({ label, url: p.url, error: String(e) });
      }
    }
    await ctx.close();
  }
}

// Security fetches via page context
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' }).catch(() => {});

const security = await page.evaluate(async (base) => {
  const r1 = await fetch(base + '/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'hack', rsvp_deadline: new Date().toISOString() }),
  });
  const j1 = await r1.json().catch(() => ({}));
  const r2 = await fetch(base + '/api/invite/seed-inv-dan-escape/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'accepted' }),
  });
  const j2 = await r2.json().catch(() => ({}));
  const r3 = await fetch(base + '/api/events/22222222-2222-2222-2222-222222222201/calendar');
  return {
    eventsPost: { status: r1.status, body: j1 },
    rsvpPost: { status: r2.status, body: j2 },
    calendar: { status: r3.status, contentType: r3.headers.get('content-type') },
  };
}, BASE);

// Chip height on mobile preferences
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(BASE + '/invite/seed-inv-alice-dinner/preferences', { waitUntil: 'domcontentloaded' }).catch(() => {});
const chipHeight = await page.evaluate(() => {
  const btn = document.querySelector('button[type="button"]');
  return btn ? Math.round(btn.getBoundingClientRect().height) : null;
});

// Dashboard hover DOM check
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {});
const dashboardLinkAttrs = await page.evaluate(() =>
  [...document.querySelectorAll('a')].slice(0, 20).map((a) => ({
    href: a.getAttribute('href'),
    hasMouseEnter: a.hasAttribute('onmouseenter') || a.outerHTML.includes('onMouseEnter'),
  })),
);

await ctx.close();
await browser.close();

const report = { results, consoleErrors, security, chipHeight, dashboardLinkAttrs };
fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
