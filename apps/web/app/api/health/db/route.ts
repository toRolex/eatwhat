import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ensureEnvLoaded } from '@/lib/env';

export const dynamic = 'force-dynamic';

ensureEnvLoaded();

const REQUIRED_TABLES = [
  'users',
  'events',
  'invitations',
  'guest_preferences',
  'proposals',
  'votes',
  'finalized_plans',
  'usage_log',
];

// Hit GET /api/health/db to verify the schema is in place.
// Reports per-table status; missing tables surface a copy-paste-ready next step.
export async function GET() {
  const db = createServiceClient();
  const results: Record<string, { ok: boolean; error?: string; count?: number }> = {};

  for (const table of REQUIRED_TABLES) {
    const { count, error } = await db
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      results[table] = { ok: false, error: error.message };
    } else {
      results[table] = { ok: true, count: count ?? 0 };
    }
  }

  const missing = Object.entries(results).filter(([, v]) => !v.ok).map(([k]) => k);
  const allOk   = missing.length === 0;

  return NextResponse.json({
    ok: allOk,
    tables: results,
    next_steps: allOk ? null : {
      message: 'One or more tables are missing or unreadable.',
      action:  'Run the SQL files in supabase/migrations/ in order via the Supabase dashboard SQL editor (001 → 002 → 003 → 004), or use `supabase db push` if you have the CLI linked.',
      missing,
    },
  }, { status: allOk ? 200 : 503 });
}
