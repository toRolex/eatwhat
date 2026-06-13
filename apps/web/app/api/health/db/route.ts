import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type CheckedTable = 'events' | 'invitations' | 'preferences' | 'proposals' | 'votes' | 'finalized_plans' | 'usage_log' | 'feature_flags' | 'funnel_events';

const REQUIRED_TABLES: CheckedTable[] = [
  'events',
  'invitations',
  'preferences',
  'proposals',
  'votes',
  'finalized_plans',
  'usage_log',
  'feature_flags',
  'funnel_events',
];

// Hit GET /api/health/db to verify the SQLite schema is in place.
export async function GET() {
  const db = getDb();
  const results: Record<string, { ok: boolean; error?: string; count?: number }> = {};

  for (const table of REQUIRED_TABLES) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
      results[table] = { ok: true, count: row.count };
    } catch (err) {
      results[table] = { ok: false, error: (err as Error).message };
    }
  }

  const missing = Object.entries(results).filter(([, v]) => !v.ok).map(([k]) => k);
  const allOk = missing.length === 0;

  return NextResponse.json({
    ok: allOk,
    tables: results,
    next_steps: allOk ? null : {
      message: 'One or more tables are missing or unreadable.',
      action: 'Ensure initDb() is called during app startup.',
      missing,
    },
  }, { status: allOk ? 200 : 503 });
}
