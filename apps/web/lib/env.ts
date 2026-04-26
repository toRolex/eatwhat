import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Force .env.local values to override system env vars.
// Needed because Windows installs (Claude Code, others) sometimes set
// ANTHROPIC_API_KEY="" at system level, which silently shadows .env.local.
let loaded = false;

export function ensureEnvLoaded() {
  if (loaded) return;
  loaded = true;

  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && value) process.env[key] = value;
  }
}
