import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const EMAIL = "anderson.mcalpine@gmail.com";
const TEST_EVENT_ID = "028d68fa-4900-4bc1-891e-e4d84d2014f0";
const OUT_DIR = path.join(process.cwd(), "qa-results");
const OUT_FILE = path.join(OUT_DIR, "checklist-results.json");

fs.mkdirSync(OUT_DIR, { recursive: true });

function now() {
  return new Date().toISOString();
}

async function devSignIn(context, email = EMAIL) {
  const req = await context.request.post(`${BASE}/api/dev/sign-in`, {
    data: { email },
  });
  const body = await req.json().catch(() => ({}));
  if (!req.ok() || !body?.action_link) {
    throw new Error(`dev sign-in failed: ${req.status()} ${JSON.stringify(body)}`);
  }
  return body.action_link;
}

function makeCapture(name) {
  const capture = {
    name,
    startedAt: now(),
    console: [],
    networkErrors: [],
    checks: [],
  };
  return capture;
}

function attachCapture(page, capture) {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      capture.console.push({
        type: msg.type(),
        text: msg.text(),
        url: page.url(),
      });
    }
  });
  page.on("response", async (res) => {
    if (res.status() >= 400) {
      let body = "";
      try {
        const ct = res.headers()["content-type"] || "";
        if (ct.includes("application/json") || ct.includes("text/")) {
          body = (await res.text()).slice(0, 400);
        }
      } catch {
        body = "";
      }
      capture.networkErrors.push({
        url: res.url(),
        status: res.status(),
        method: res.request().method(),
        body,
      });
    }
  });
}

function addCheck(capture, id, flow, passed, details = {}) {
  capture.checks.push({ id, flow, passed, ...details });
}

async function run() {
  const report = {
    base: BASE,
    email: EMAIL,
    testEventId: TEST_EVENT_ID,
    startedAt: now(),
    flows: [],
  };

  const browser = await chromium.launch({ headless: true });

  // Auth flow
  {
    const flow = makeCapture("auth");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    attachCapture(page, flow);

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    const actionLink = await devSignIn(ctx);
    await page.goto(actionLink, { waitUntil: "networkidle" });
    addCheck(flow, "AUTH-1", "Magic link login lands on dashboard", page.url().includes("/dashboard"), {
      finalUrl: page.url(),
    });

    const secondCtx = await browser.newContext();
    const secondPage = await secondCtx.newPage();
    attachCapture(secondPage, flow);
    const crossActionLink = await devSignIn(ctx);
    await secondPage.goto(crossActionLink, { waitUntil: "networkidle" });
    addCheck(flow, "AUTH-2", "Cross-context magic link works", secondPage.url().includes("/dashboard"), {
      finalUrl: secondPage.url(),
    });

    const anonCtx = await browser.newContext();
    const anonPage = await anonCtx.newPage();
    attachCapture(anonPage, flow);
    await anonPage.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    addCheck(flow, "AUTH-3", "Unauthenticated /dashboard redirects to /login", anonPage.url().includes("/login"), {
      finalUrl: anonPage.url(),
    });
    await anonPage.goto(`${BASE}/events/${TEST_EVENT_ID}`, { waitUntil: "networkidle" });
    addCheck(flow, "AUTH-4", "Unauthenticated /events/[id] redirects to /login", anonPage.url().includes("/login"), {
      finalUrl: anonPage.url(),
    });

    await secondCtx.close();
    await anonCtx.close();
    await ctx.close();
    flow.completedAt = now();
    report.flows.push(flow);
  }

  // Host + navigation + guest + demo combined in authenticated session
  {
    const flow = makeCapture("host-guest-nav-demo");
    const hostCtx = await browser.newContext();
    const hostPage = await hostCtx.newPage();
    attachCapture(hostPage, flow);
    const hostAction = await devSignIn(hostCtx);
    await hostPage.goto(hostAction, { waitUntil: "networkidle" });
    await hostPage.waitForURL(/\/dashboard/, { timeout: 8000 }).catch(() => {});

    await hostPage.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    addCheck(flow, "NAV-1", "/dashboard shows event list", /Events|event/i.test(await hostPage.locator("body").innerText()), {
      finalUrl: hostPage.url(),
    });

    await hostPage.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });
    const createFormLoaded = (await hostPage.locator("#title").count()) > 0;
    addCheck(flow, "NAV-2", "/events/new form loads", createFormLoaded, { finalUrl: hostPage.url() });

    await hostPage.goto(`${BASE}/dev`, { waitUntil: "networkidle" });
    const devText = await hostPage.locator("body").innerText();
    addCheck(
      flow,
      "NAV-3",
      "/dev tools load",
      /pipeline|cost|log|inspector/i.test(devText),
      { finalUrl: hostPage.url(), excerpt: devText.slice(0, 200) },
    );

    await hostPage.goto(`${BASE}/events/new`, { waitUntil: "networkidle" });
    const eventNameInput = hostPage.locator("#title");
    const locationInput = hostPage.locator("#location");
    const deadlineInput = hostPage.locator("#deadline");
    const unique = `QA Event ${Date.now()}`;
    if ((await eventNameInput.count()) > 0) await eventNameInput.fill(unique);
    if ((await locationInput.count()) > 0) await locationInput.fill("Toronto");
    if ((await deadlineInput.count()) > 0) await deadlineInput.fill("2026-12-31T18:00");
    const createBtn = hostPage.locator("button[type='submit']").first();
    await Promise.all([
      hostPage.waitForURL(/\/events\/(?!new$)[^/?#]+$/, { timeout: 10000 }).catch(() => {}),
      createBtn.click(),
    ]);
    const eventUrl = hostPage.url();
    const eventId = eventUrl.split("/events/")[1]?.split(/[/?#]/)[0];
    addCheck(flow, "HOST-1", "Create event redirects to event detail", /\/events\/(?!new$)[^/?#]+$/.test(eventUrl), {
      finalUrl: eventUrl,
      eventId: eventId || null,
    });

    // Wait for RSC content: .event-back-link is only rendered on the event
    // detail page, not in the shared nav or the /events/new shell.
    await hostPage.waitForSelector('a.event-back-link', { timeout: 8000 }).catch(() => {});
    const eventPageText = await hostPage.locator("body").innerText();
    addCheck(flow, "HOST-2", "Event detail shows status badge", /status|collecting|draft|planning|deciding|finalized|finalised/i.test(eventPageText), {
      excerpt: eventPageText.slice(0, 250),
    });

    // Events are created in draft status; transition to open before sending invites
    // (draft → open → collecting is the required state machine path)
    if (eventId && eventId !== "new") {
      await hostCtx.request.patch(`${BASE}/api/events/${eventId}`, {
        data: { status: "open" },
      });
    }

    // Invite management lives at /events/[id]/invite, not on the detail page
    await hostPage.goto(`${BASE}/events/${eventId}/invite`, { waitUntil: "networkidle" });

    const guestName = hostPage.locator("input[placeholder='Alex']").first();
    const guestEmail = hostPage.locator("input[placeholder='alex@example.com']").first();
    const addGuestBtn = hostPage.locator("button:has-text('Add guest')").first();

    // Intercept the POST response to capture the invite slug for the GUEST flow
    let createdInviteSlug = null;
    if ((await guestName.count()) > 0 && (await addGuestBtn.count()) > 0) {
      await guestName.fill("QA Guest");
      await guestEmail.fill(`qa+${Date.now()}@example.com`);
      const [inviteRes] = await Promise.all([
        hostPage.waitForResponse(
          (r) => r.url().includes(`/api/events/${eventId}/invite`) && r.request().method() === "POST",
          { timeout: 8000 },
        ),
        addGuestBtn.click(),
      ]);
      const inviteData = await inviteRes.json().catch(() => ({}));
      createdInviteSlug = inviteData.invitations?.[0]?.slug ?? null;
      await hostPage.waitForTimeout(400);
    }

    const postInviteText = await hostPage.locator("body").innerText();
    addCheck(flow, "HOST-3", "Add guest appears in list", /QA Guest|qa\+/i.test(postInviteText), {
      excerpt: postInviteText.slice(0, 300),
    });

    const copyLinkBtn = hostPage.locator("button:has-text('Copy link')").first();
    let copyClicked = false;
    if ((await copyLinkBtn.count()) > 0) {
      await copyLinkBtn.click();
      copyClicked = true;
    }
    addCheck(flow, "HOST-4", "Copy invite link button works", copyClicked, {});

    const aiLocation = hostPage.locator("input[name='searchLocation'], input[placeholder*='location' i]").first();
    if ((await aiLocation.count()) > 0) await aiLocation.fill("Toronto");
    const runAiBtn = hostPage.locator("button:has-text('Run AI')").first();
    let aiLoaded = false;
    if ((await runAiBtn.count()) > 0) {
      await runAiBtn.click();
      await hostPage.waitForTimeout(2500);
      const txt = await hostPage.locator("body").innerText();
      aiLoaded = /proposal|result|option/i.test(txt);
    }
    addCheck(flow, "HOST-5", "Run AI produces proposals", aiLoaded, { finalUrl: hostPage.url() });

    const existingEventPage = await browser.newContext();
    const existingPage = await existingEventPage.newPage();
    attachCapture(existingPage, flow);
    const existingAction = await devSignIn(existingEventPage);
    await existingPage.goto(existingAction, { waitUntil: "networkidle" });
    await existingPage.goto(`${BASE}/events/${TEST_EVENT_ID}`, { waitUntil: "networkidle" });
    const runAiExisting = existingPage.locator("button:has-text('Run AI')").first();
    let rerunSeen = false;
    if ((await runAiExisting.count()) > 0) {
      await runAiExisting.click();
      await existingPage.waitForTimeout(1500);
      const txt = await existingPage.locator("body").innerText();
      rerunSeen = /confirm|rerun|run again/i.test(txt);
    }
    addCheck(flow, "HOST-8", "Re-run AI shows confirmation", rerunSeen, { finalUrl: existingPage.url() });

    const finalizeBtn = existingPage.locator("button:has-text('Finalize'), button:has-text('Finalise')").first();
    let finalized = false;
    if ((await finalizeBtn.count()) > 0) {
      await finalizeBtn.click();
      await existingPage.waitForTimeout(1200);
      const txt = await existingPage.locator("body").innerText();
      finalized = /finalized|finalised/i.test(txt);
    }
    addCheck(flow, "HOST-9", "Finalize proposal moves status to finalized", finalized, { finalUrl: existingPage.url() });

    // Missing-preference and missing-location edge checks on fresh event
    await hostPage.goto(eventUrl, { waitUntil: "networkidle" });
    const runAiNoPrefs = hostPage.locator("button:has-text('Run AI')").first();
    let noPrefsError = false;
    if ((await runAiNoPrefs.count()) > 0) {
      await runAiNoPrefs.click();
      await hostPage.waitForTimeout(1000);
      const txt = await hostPage.locator("body").innerText();
      noPrefsError = /no preferences|need preferences|preferences required/i.test(txt);
    }
    addCheck(flow, "HOST-6", "Run AI with no preferences shows error", noPrefsError, { finalUrl: hostPage.url() });

    if ((await aiLocation.count()) > 0) await aiLocation.fill("");
    if ((await runAiNoPrefs.count()) > 0) {
      await runAiNoPrefs.click();
      await hostPage.waitForTimeout(900);
    }
    const noLocText = await hostPage.locator("body").innerText();
    addCheck(flow, "HOST-7", "Run AI with no location shows error", /location|required|enter location/i.test(noLocText), {
      excerpt: noLocText.slice(0, 240),
    });

    // Guest flow: use slug captured from the POST /invite response in HOST-3
    const inviteSlug = createdInviteSlug;
    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();
    attachCapture(guestPage, flow);
    if (inviteSlug) {
      await guestPage.goto(`${BASE}/invite/${inviteSlug}`, { waitUntil: "networkidle" });
      const inviteText = await guestPage.locator("body").innerText();
      addCheck(flow, "GUEST-1", "Invite page loads with event details", /invite|event|host|guest/i.test(inviteText), {
        finalUrl: guestPage.url(),
      });

      const acceptInvite = guestPage.locator("button:has-text('Accept invite'), a:has-text('Accept invite')").first();
      if ((await acceptInvite.count()) > 0) {
        await acceptInvite.click();
        await guestPage.waitForTimeout(1500);
      }
      addCheck(flow, "GUEST-2", "Accept invite redirects to preferences form", /preferences/.test(guestPage.url()), {
        finalUrl: guestPage.url(),
      });

      const prefSubmit = guestPage.locator("button[type='submit']").first();
      const cuisineChip = guestPage.locator("button:has-text('Vegetarian'), button:has-text('Italian')").first();
      if ((await cuisineChip.count()) > 0) await cuisineChip.click();
      if ((await prefSubmit.count()) > 0) {
        await prefSubmit.click();
        await guestPage.waitForTimeout(1200);
      }
      const prefText = await guestPage.locator("body").innerText();
      addCheck(flow, "GUEST-3", "Submit preferences shows success", /success|saved|confirmed|thanks/i.test(prefText), {
        finalUrl: guestPage.url(),
      });

      const rank1 = guestPage.locator("select[name*='rank1'], input[name*='rank1']").first();
      const rank2 = guestPage.locator("select[name*='rank2'], input[name*='rank2']").first();
      const rank3 = guestPage.locator("select[name*='rank3'], input[name*='rank3']").first();
      let voteSubmitted = false;
      if ((await rank1.count()) && (await rank2.count()) && (await rank3.count())) {
        if ((await rank1.evaluate((el) => el.tagName)) === "SELECT") {
          await rank1.selectOption({ index: 1 }).catch(() => {});
          await rank2.selectOption({ index: 2 }).catch(() => {});
          await rank3.selectOption({ index: 3 }).catch(() => {});
        }
        const voteSubmit = guestPage.locator("button:has-text('Submit vote'), button[type='submit']").first();
        if ((await voteSubmit.count()) > 0) {
          await voteSubmit.click();
          await guestPage.waitForTimeout(1200);
          voteSubmitted = true;
        }
      }
      addCheck(flow, "GUEST-4", "Vote ranks can be set and submitted", voteSubmitted, { finalUrl: guestPage.url() });
    } else {
      addCheck(flow, "GUEST-1", "Invite page loads with event details", false, { note: "No invite link found on host page" });
      addCheck(flow, "GUEST-2", "Accept invite redirects to preferences form", false, { note: "No invite slug available" });
      addCheck(flow, "GUEST-3", "Submit preferences shows success", false, { note: "No invite slug available" });
      addCheck(flow, "GUEST-4", "Vote ranks can be set and submitted", false, { note: "No invite slug available" });
    }

    const consolesBefore = flow.console.length;
    await guestPage.goto(`${BASE}/invite/invalid-not-real`, { waitUntil: "networkidle" });
    const invalidText = await guestPage.locator("body").innerText();
    addCheck(flow, "GUEST-5", "Invalid invite slug shows branded 404", /not valid|invalid|go home|invite/i.test(invalidText), {
      finalUrl: guestPage.url(),
      excerpt: invalidText.slice(0, 200),
    });
    const parallelRouteWarnings = flow.console.slice(consolesBefore).filter((m) =>
      m.text.includes("No default component was found for a parallel route"),
    );
    addCheck(flow, "GUEST-5b", "Invalid invite page: no parallel-route console warning", parallelRouteWarnings.length === 0, {
      warnings: parallelRouteWarnings.map((m) => m.text),
    });

    // demo API
    const demoRes = await hostCtx.request.post(`${BASE}/api/demo/synthesize`, {
      data: { cuisine: "Italian", city: "Toronto" },
    });
    const demoText = await demoRes.text();
    addCheck(flow, "DEMO-1", "/api/demo/synthesize returns safe 503 on AI failure", demoRes.status() === 503, {
      status: demoRes.status(),
      body: demoText.slice(0, 300),
    });

    await guestCtx.close();
    await existingEventPage.close();
    await hostCtx.close();
    flow.completedAt = now();
    report.flows.push(flow);
  }

  await browser.close();
  report.completedAt = now();

  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ output: OUT_FILE }, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
