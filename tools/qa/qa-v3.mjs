import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:3000';
const OUT = path.join(__dirname, 'qa-screenshots-v3');
fs.mkdirSync(OUT, { recursive: true });

function loadEnv() {
  const envPath = path.join(ROOT, 'apps/web/.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const viewports = { desktop: { width: 1280, height: 900 }, mobile: { width: 375, height: 812 } };

async function setDark(page, on) {
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
  }, on);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return path.basename(file);
}

async function bodyText(page) {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
}

async function resetBobPending() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, note: 'missing env' };
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db
    .from('invitations')
    .update({ status: 'pending', responded_at: null, user_id: null })
    .eq('slug', 'seed-inv-bob-dinner');
  return { ok: !error, error: error?.message };
}

async function hostMagicLink() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: 'sarah.chen@example.com',
    options: { redirectTo: `${BASE}/api/auth/callback` },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, link: data.properties?.action_link ?? data.properties?.actionLink };
}

const index = [];
const consoleLog = [];
const fixes = {};
const flows = {};

// Reset bob for accept test
flows.resetBob = await resetBobPending();

const browser = await chromium.launch({ headless: true });

// --- CRITICAL: Accept without auth + 4 screenshots on /confirmed ---
await resetBobPending();
let acceptDone = false;
for (const dark of [false, true]) {
  const theme = dark ? 'D' : 'L';
  for (const [vpName, vp] of Object.entries(viewports)) {
    const vpTag = vpName === 'desktop' ? 'D' : 'M';
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (['error', 'warning'].includes(m.type())) {
        consoleLog.push({ type: m.type(), text: m.text(), page: 'accept-flow', vp: vpTag, theme });
      }
    });
    if (!acceptDone) {
      await page.goto(`${BASE}/invite/seed-inv-bob-dinner`, { waitUntil: 'networkidle', timeout: 30000 });
      await setDark(page, dark);
      const acceptBtn = page.locator('button').filter({ hasText: /^Accept invite$/ }).first();
      if (await acceptBtn.count()) {
        const [resp] = await Promise.all([
          page.waitForResponse((r) => r.url().includes('/api/invite/seed-inv-bob-dinner/accept') && r.request().method() === 'POST', { timeout: 15000 }).catch(() => null),
          acceptBtn.click(),
        ]);
        await page.waitForURL(/\/confirmed/, { timeout: 15000 }).catch(() => {});
        flows.acceptCritical = {
          apiStatus: resp?.status(),
          apiBody: resp ? await resp.json().catch(() => ({})) : null,
          finalUrl: page.url(),
          landsOnConfirmed: page.url().includes('/confirmed'),
          onLogin: page.url().includes('/login'),
        };
        acceptDone = true;
      } else {
        flows.acceptCritical = { note: 'No Accept invite button', url: page.url(), text: (await bodyText(page)).slice(0, 200) };
      }
    } else {
      await page.goto(`${BASE}/invite/seed-inv-bob-dinner/confirmed`, { waitUntil: 'networkidle', timeout: 30000 });
      await setDark(page, dark);
    }
    await page.waitForTimeout(400);
    const file = await shot(page, `bob-confirmed-after-accept__${vpTag}-${theme}`);
    index.push({
      label: `[${vpTag}-${theme}]`,
      page: '/invite/seed-inv-bob-dinner → accept → confirmed',
      file,
      url: page.url(),
      excerpt: (await bodyText(page)).slice(0, 200),
    });
    await ctx.close();
  }
}

// Re-reset bob once more for preference flow isn't needed; alice prefs flow separate

// --- Alice preferences → submit → confirmed ---
{
  const ctx = await browser.newContext({ viewport: viewports.desktop });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/invite/seed-inv-alice-dinner/preferences`, { waitUntil: 'networkidle' });
  const veg = page.locator('button').filter({ hasText: 'Vegetarian' }).first();
  if (await veg.count()) await veg.click();
  const submit = page.locator('button[type="submit"]').first();
  const [prefResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/preferences') && r.request().method() === 'POST', { timeout: 15000 }).catch(() => null),
    submit.click(),
  ]);
  await page.waitForURL(/\/confirmed/, { timeout: 15000 }).catch(() => {});
  flows.alicePrefs = {
    prefApiStatus: prefResp?.status(),
    finalUrl: page.url(),
    landsOnConfirmed: page.url().includes('/confirmed'),
  };
  for (const dark of [false, true]) {
    const theme = dark ? 'D' : 'L';
    await setDark(page, dark);
    await shot(page, `alice-prefs-after-submit__D-${theme}`);
  }
  await ctx.close();
}

// --- Full screenshot matrix ---
const pages = [
  ['login', '/login'],
  ['invite-bob', '/invite/seed-inv-bob-dinner'],
  ['invite-alice', '/invite/seed-inv-alice-dinner'],
  ['invite-invalid', '/invite/this-slug-does-not-exist'],
  ['invite-alice-prefs', '/invite/seed-inv-alice-dinner/preferences'],
  ['invite-alice-confirmed', '/invite/seed-inv-alice-dinner/confirmed'],
  ['invite-bob-confirmed', '/invite/seed-inv-bob-dinner/confirmed'],
  ['invite-david-rsvp', '/invite/seed-inv-david-escape/rsvp'],
  ['e-nobu', '/e/seed-team-dinner-nobu'],
  ['dashboard', '/dashboard'],
  ['events-new', '/events/new'],
];

for (const dark of [false, true]) {
  const theme = dark ? 'D' : 'L';
  for (const [vpName, vp] of Object.entries(viewports)) {
    const vpTag = vpName === 'desktop' ? 'D' : 'M';
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (['error', 'warning'].includes(m.type())) {
        consoleLog.push({ type: m.type(), text: m.text(), vp: vpTag, theme });
      }
    });
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await setDark(page, dark);
    for (const [id, url] of pages) {
      const label = `${id}__${vpTag}-${theme}`;
      const resp = await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
      await page.waitForTimeout(500);
      const file = await shot(page, label);
      index.push({
        label: `[${vpTag}-${theme}]`,
        page: url,
        file,
        status: resp?.status(),
        url: page.url(),
        excerpt: (await bodyText(page)).slice(0, 200),
      });
    }
    await ctx.close();
  }
}

// --- Host auth (Sarah) ---
const hostCtx = await browser.newContext({ viewport: viewports.desktop });
const hostPage = await hostCtx.newPage();
const hostLink = await hostMagicLink();
flows.hostAuth = hostLink;
if (hostLink.ok && hostLink.link) {
  await hostPage.goto(hostLink.link, { waitUntil: 'networkidle', timeout: 60000 });
  await hostPage.waitForTimeout(2000);
  await hostPage.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  flows.hostDashboard = { url: hostPage.url(), onDashboard: hostPage.url().includes('/dashboard'), text: (await bodyText(hostPage)).slice(0, 300) };
  fixes[10] = await hostPage.evaluate(() =>
    [...document.querySelectorAll('a.event-card, a[href*="/events/"]')].map((a) => ({
      href: a.getAttribute('href'),
      onMouseEnter: a.hasAttribute('onmouseenter'),
      className: a.className,
      hoverRule: getComputedStyle(a).transition,
    })),
  );
  const card = hostPage.locator('a.event-card').first();
  if (await card.count()) {
    fixes[10].hoverShadow = await card.evaluate((el) => {
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      const parent = el;
      return getComputedStyle(parent).boxShadow;
    });
  }
  for (const dark of [false, true]) {
    const theme = dark ? 'D' : 'L';
    await setDark(hostPage, dark);
    await hostPage.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await shot(hostPage, `dashboard-authed__D-${theme}`);
  }
  await hostPage.goto(`${BASE}/events/new`, { waitUntil: 'networkidle' });
  const eventsText = await bodyText(hostPage);
  fixes[11] = { hasDateFlexible: /Date flexible/i.test(eventsText), redirectedToLogin: hostPage.url().includes('/login'), url: hostPage.url() };
  for (const dark of [false, true]) {
    const theme = dark ? 'D' : 'L';
    await setDark(hostPage, dark);
    await hostPage.goto(`${BASE}/events/new`, { waitUntil: 'networkidle' });
    await shot(hostPage, `events-new-authed__D-${theme}`);
  }
} else {
  fixes[10] = { note: 'host auth failed', error: hostLink.error };
  fixes[11] = { note: 'host auth failed', error: hostLink.error };
}
await hostCtx.close();

// --- Fix verifications (guest) ---
const ctx = await browser.newContext({ viewport: viewports.desktop });
const page = await ctx.newPage();

await page.goto(`${BASE}/invite/this-slug-does-not-exist`, { waitUntil: 'networkidle' });
const invalidText = await bodyText(page);
fixes[7] = {
  branded: /isn't valid|link isn't valid/i.test(invalidText),
  goHome: (await page.locator('a[href="/"], a:has-text("Go home")').count()) > 0,
  default404: /404|This page could not be found/i.test(invalidText),
};

await setDark(page, true);
await page.goto(`${BASE}/invite/seed-inv-alice-dinner`, { waitUntil: 'networkidle' });
const aliceDark = await bodyText(page);
fixes[2] = { hasGoing: /You.re going|going/i.test(aliceDark), text: aliceDark.slice(0, 400) };
const goingChip = page.locator('text=/You.re going/i').first();
if (await goingChip.count()) {
  fixes[2].contrast = await goingChip.evaluate((el) => {
    const s = getComputedStyle(el);
    const p = el.parentElement ? getComputedStyle(el.parentElement) : s;
    return { color: s.color, bg: p.backgroundColor, fontSize: s.fontSize };
  });
}

fixes[1] = flows.alicePrefs ?? { note: 'see flows.alicePrefs' };
fixes.acceptWithoutAuth = flows.acceptCritical;

fixes[6] = await page.evaluate(async (base) => {
  const r = await fetch(`${base}/api/invite/seed-inv-bob-dinner/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'accepted' }),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}, BASE);

const mctx = await browser.newContext({ viewport: viewports.mobile });
const mpage = await mctx.newPage();
await mpage.goto(`${BASE}/invite/seed-inv-alice-dinner/preferences`, { waitUntil: 'networkidle' });
fixes[12] = await mpage.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Vegetarian'));
  if (!btn) return { height: null, note: 'no chip found' };
  const r = btn.getBoundingClientRect();
  return { height: Math.round(r.height), padding: getComputedStyle(btn).padding };
});

await setDark(mpage, true);
await mpage.goto(`${BASE}/invite/seed-inv-bob-dinner/rsvp`, { waitUntil: 'networkidle' });
const rsvpText = await bodyText(mpage);
fixes[3] = { rsvpDarkText: rsvpText.slice(0, 400), hasGoing: /going/i.test(rsvpText) };
// After bob accepted, rsvp page should show going state
await mpage.goto(`${BASE}/invite/seed-inv-bob-dinner/rsvp`, { waitUntil: 'networkidle' });
if (await mpage.locator('text=/You.re going|going/i').count()) {
  fixes[3].hasGoing = true;
  const chip = mpage.locator('text=/You.re going/i').first();
  if (await chip.count()) {
    fixes[3].contrast = await chip.evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, bg: getComputedStyle(el.parentElement ?? el).backgroundColor };
    });
  }
}

fixes.security = await page.evaluate(async (base) => {
  const r1 = await fetch(`${base}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'hack', rsvp_deadline: new Date().toISOString() }),
  });
  const r2 = await fetch(`${base}/api/invite/seed-inv-bob-dinner/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'accepted' }),
  });
  const r3 = await fetch(`${base}/api/events/22222222-2222-2222-2222-222222222201/calendar`);
  return {
    eventsPost: { status: r1.status, body: await r1.json().catch(() => ({})) },
    inviteRsvp: { status: r2.status, body: await r2.json().catch(() => ({})) },
    calendar: { status: r3.status, ct: r3.headers.get('content-type'), snippet: (await r3.text()).slice(0, 80) },
  };
});

const mobileChecks = {};
for (const [id, url] of [
  ['login', '/login'],
  ['invite-alice', '/invite/seed-inv-alice-dinner'],
  ['invite-prefs', '/invite/seed-inv-alice-dinner/preferences'],
  ['invite-confirmed', '/invite/seed-inv-alice-dinner/confirmed'],
]) {
  await mpage.goto(BASE + url, { waitUntil: 'networkidle' });
  mobileChecks[id] = await mpage.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  }));
}

// Fix 4/5/8/9 — page render checks from index
fixes[4] = { inviteRenders: index.some((i) => i.page.includes('seed-inv-alice') && i.excerpt.includes('INVITED')) };
fixes[5] = { confirmedRenders: index.some((i) => i.page.includes('confirmed') && /expecting you/i.test(i.excerpt)) };
fixes[8] = { cspErrors: consoleLog.filter((c) => /Content Security Policy|unsafe-eval|fonts\.googleapis/i.test(c.text)) };
fixes[9] = { publicEvent: index.find((i) => i.page === '/e/seed-team-dinner-nobu')?.excerpt?.slice(0, 200) };

await mctx.close();
await ctx.close();
await browser.close();

const report = { index, consoleLog, fixes, flows, mobileChecks };
fs.writeFileSync(path.join(OUT, 'qa-v3-results.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ screenshotCount: index.length, flows, fixes: Object.fromEntries(Object.entries(fixes).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v).slice(0, 120) : v])) }, null, 2));
