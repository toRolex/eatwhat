/**
 * QA fix loop driver.
 *
 * Usage:
 *   node qa-loop.mjs
 *
 * Runs qa-checklist.mjs, reads the result JSON, finds the first
 * actionable failing check, and prints a structured ISSUE block that
 * Claude can read and fix. Exits 0 when all checks pass, 1 otherwise.
 *
 * Checks listed in SKIP_IDS are known-external failures (e.g. AI key
 * not configured) and are excluded from the fix loop.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_FILE = path.join(__dirname, "qa-results", "checklist-results.json");
const CHECKLIST = path.join(__dirname, "qa-checklist.mjs");

// Checks we do not attempt to fix (external dependencies, spend caps, etc.)
const SKIP_IDS = new Set([
  "DEMO-1",   // AI synthesis unavailable — no Anthropic key in dev
  "HOST-5",   // Run AI produces proposals — same reason
  "HOST-8",   // Re-run AI shows confirmation — same reason
  "HOST-9",   // Finalize — depends on HOST-5 having run first
]);

function run() {
  console.error("[qa-loop] Running qa-checklist.mjs …");
  const result = spawnSync("node", [CHECKLIST], {
    stdio: ["ignore", "inherit", "inherit"],
    cwd: __dirname,
  });

  if (!fs.existsSync(RESULTS_FILE)) {
    console.error("[qa-loop] No results file written — checklist crashed.");
    process.exit(2);
  }

  const report = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8"));

  // Flatten all checks across all flows
  const all = report.flows.flatMap((flow) =>
    flow.checks.map((c) => ({ ...c, flow: flow.name }))
  );

  const passed = all.filter((c) => c.passed);
  const failed = all.filter((c) => !c.passed);
  const actionable = failed.filter((c) => !SKIP_IDS.has(c.id));
  const skipped = failed.filter((c) => SKIP_IDS.has(c.id));

  console.error(
    `[qa-loop] ${passed.length} passed / ${failed.length} failed` +
    (skipped.length ? ` (${skipped.length} skipped as external)` : "")
  );

  if (actionable.length === 0) {
    console.log(JSON.stringify({ status: "all_pass", passed: passed.length, skipped: skipped.length }, null, 2));
    process.exit(0);
  }

  // Report only the first actionable failure
  const first = actionable[0];

  // Collect console warnings / network errors from the relevant flow
  const flowData = report.flows.find((f) => f.name === first.flow) ?? {};
  const relevantNetworkErrors = (flowData.networkErrors ?? []).filter(
    (e) => e.status >= 400
  );
  const relevantConsole = (flowData.console ?? []).filter(
    (m) => m.type === "error"
  );

  const issue = {
    status: "issue_found",
    check_id: first.id,
    description: first.flow + " — " + first.id,
    passed: false,
    details: first,
    remaining_failures: actionable.slice(1).map((c) => c.id),
    context: {
      network_errors: relevantNetworkErrors.slice(0, 5),
      console_errors: relevantConsole.slice(0, 5),
    },
  };

  console.log(JSON.stringify(issue, null, 2));
  process.exit(1);
}

run();
