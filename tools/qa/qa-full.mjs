import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://127.0.0.1:3000';
const OUT = path.join(process.cwd(), 'qa-screenshots-v2');
fs.mkdirSync(OUT, { recursive: true });

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
  return file;
}

async function bodyText(page) {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
}

const index = [];
const consoleLog = [];
const fixes = {};

const browser = await chromium.launch({ headless: true });

// --- Screenshots matrix ---
const pages = [
  ['login', '/login'],
  ['invite-bob', '/invite/seed-inv-bob-dinner'],
  ['invite-alice', '/invite/seed-inv-alice-dinner'],
  ['invite-invalid', '/invite/this-slug-does-not-exist'],
  ['invite-alice-prefs', '/invite/seed-inv-alice-dinner/preferences'],
  ['invite-alice-confirmed', '/invite/seed-inv-alice-dinner/confirmed'],
  ['invite-dan-rsvp', '/invite/seed-inv-david-escape/rsvp'],
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
    await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
    await setDark(page, dark);
    for (const [id, url] of pages) {
      const label = `${id}__${vpTag}-${theme}`;
      const resp = await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
      await page.waitForTimeout(600);
      const file = await shot(page, label);
      const text = await bodyText(page);
      index.push({
        label: `[${vpTag}-${theme}]`,
        page: url,
        file: path.basename(file),
        status: resp?.status(),
        url: page.url(),
        excerpt: text.slice(0, 200),
      });
    }
    await ctx.close();
  }
}

// --- Fix verifications ---
const ctx = await browser.newContext({ viewport: viewports.desktop });
const page = await ctx.newPage();

// Fix 7 invalid
await page.goto(BASE + '/invite/this-slug-does-not-exist', { waitUntil: 'networkidle' });
const invalidText = await bodyText(page);
fixes[7] = {
  branded: /isn't valid|isn't valid|link isn't valid|This link/i.test(invalidText),
  goHome: (await page.locator('a[href="/"], a:has-text("Go home")').count()) > 0,
  default404: /404|This page could not be found/i.test(invalidText),
  text: invalidText.slice(0, 300),
};

// Fix 2 alice landing dark
await setDark(page, true);
await page.goto(BASE + '/invite/seed-inv-alice-dinner', { waitUntil: 'networkidle' });
const aliceDark = await bodyText(page);
fixes[2] = {
  hasGoing: /You're going|You\u2019re going|going/i.test(aliceDark),
  text: aliceDark.slice(0, 400),
};
const goingChip = page.locator('text=/You.re going/i').first();
if (await goingChip.count()) {
  fixes[2].contrast = await goingChip.evaluate((el) => {
    const s = getComputedStyle(el);
    const p = el.parentElement ? getComputedStyle(el.parentElement) : s;
    return { color: s.color, bg: p.backgroundColor, fontSize: s.fontSize };
  });
}

// Fix 11 events new
await setDark(page, false);
await page.goto(BASE + '/events/new', { waitUntil: 'networkidle' });
const eventsText = await bodyText(page);
fixes[11] = { hasDateFlexible: /Date flexible/i.test(eventsText), redirectedToLogin: page.url().includes('/login') };

// Fix 6 RSVP API
fixes[6] = await page.evaluate(async (base) => {
  const r = await fetch(`${base}/api/invite/seed-inv-david-escape/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'accepted' }),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
}, BASE);

// Fix 6 UI dan rsvp
await page.goto(BASE + '/invite/seed-inv-david-escape/rsvp', { waitUntil: 'networkidle' });
fixes[6].uiText = (await bodyText(page)).slice(0, 400);

// Fix 12 chip height mobile
const mctx = await browser.newContext({ viewport: viewports.mobile });
const mpage = await mctx.newPage();
await mpage.goto(BASE + '/invite/seed-inv-alice-dinner/preferences', { waitUntil: 'networkidle' });
fixes[12] = await mpage.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Vegetarian'));
  if (!btn) return { height: null, note: 'no chip found' };
  const r = btn.getBoundingClientRect();
  return { height: Math.round(r.height), padding: getComputedStyle(btn).padding };
});

// Fix 10 dashboard hover attrs (may redirect login)
await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
fixes[10] = await page.evaluate(() =>
  [...document.querySelectorAll('a')].filter((a) => a.href?.includes('/events/')).map((a) => ({
    href: a.getAttribute('href'),
    onMouseEnter: a.hasAttribute('onmouseenter'),
    className: a.className,
  })),
);

// Fix 1 preference redirect - check code path via bob accept if pending
await page.goto(BASE + '/invite/seed-inv-bob-dinner', { waitUntil: 'networkidle' });
const acceptBtn = page.locator('button:has-text("Accept invite"), a:has-text("Accept invite")').first();
if (await acceptBtn.count()) {
  await acceptBtn.click();
  await page.waitForTimeout(2500);
  fixes[1] = { afterAcceptUrl: page.url(), landsOnConfirmed: page.url().includes('/confirmed') };
} else {
  fixes[1] = { note: 'No Accept invite button on landing', url: page.url(), text: (await bodyText(page)).slice(0, 300) };
}

// Fix 3/4 RSVP dark chip - visit rsvp bob
await setDark(mpage, true);
await mpage.goto(BASE + '/invite/seed-inv-bob-dinner/rsvp', { waitUntil: 'networkidle' });
const rsvpText = await bodyText(mpage);
fixes[3] = { rsvpDarkText: rsvpText.slice(0, 400), hasGoing: /going/i.test(rsvpText) };

// Security
fixes.security = await page.evaluate(async (base) => {
  const r1 = await fetch(`${base}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'hack', rsvp_deadline: new Date().toISOString() }),
  });
  const j1 = await r1.json().catch(() => ({}));
  const r3 = await fetch(`${base}/api/events/22222222-2222-2222-2222-222222222201/calendar`);
  return {
    eventsPost: { status: r1.status, body: j1 },
    calendar: { status: r3.status, ct: r3.headers.get('content-type') },
  };
});

// Horizontal scroll mobile check
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

await mctx.close();
await ctx.close();
await browser.close();

const report = { index, consoleLog, fixes, mobileChecks };
fs.writeFileSync(path.join(OUT, 'qa-full-results.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ screenshotCount: index.length, fixes }, null, 2));
