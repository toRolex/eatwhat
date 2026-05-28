import { createClient } from '@supabase/supabase-js';
import type { Database } from '../packages/db/src/database.types';
import * as fs from 'fs';
import * as path from 'path';

// Load env from apps/web/.env.local if present
const envPath = path.resolve(__dirname, '../apps/web/.env.local');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Fixed UUIDs for idempotency
const USER_1_ID = '11111111-1111-1111-1111-111111111101';
const USER_2_ID = '11111111-1111-1111-1111-111111111102';
const EVENT_1_ID = '22222222-2222-2222-2222-222222222201';
const EVENT_2_ID = '22222222-2222-2222-2222-222222222202';
const EVENT_3_ID = '22222222-2222-2222-2222-222222222203';
const INV_1_ID = '33333333-3333-3333-3333-333333333301';
const INV_2_ID = '33333333-3333-3333-3333-333333333302';
const INV_3_ID = '33333333-3333-3333-3333-333333333303';
const INV_4_ID = '33333333-3333-3333-3333-333333333304';
const INV_5_ID = '33333333-3333-3333-3333-333333333305';
const PROP_1_ID = '66666666-6666-6666-6666-666666666601';
const PROP_2_ID = '66666666-6666-6666-6666-666666666602';
const PROP_3_ID = '66666666-6666-6666-6666-666666666603';
const PREF_1_ID = '44444444-4444-4444-4444-444444444401';
const PREF_2_ID = '44444444-4444-4444-4444-444444444402';
const PREF_3_ID = '44444444-4444-4444-4444-444444444403';
const AILOG_1_ID = '55555555-5555-5555-5555-555555555501';
const AILOG_2_ID = '55555555-5555-5555-5555-555555555502';
const AILOG_3_ID = '55555555-5555-5555-5555-555555555503';

type InsertResult = { table: string; inserted: number; skipped: number };

async function upsertAndReport<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  conflictColumn: string,
  overwrite = false,
): Promise<InsertResult> {
  const { error, data } = await (db as ReturnType<typeof createClient>)
    .from(table)
    .upsert(rows, { onConflict: conflictColumn, ignoreDuplicates: !overwrite })
    .select();
  if (error) {
    console.error(`Error inserting into ${table}:`, error.message);
    return { table, inserted: 0, skipped: rows.length };
  }
  const inserted = data?.length ?? 0;
  return { table, inserted, skipped: rows.length - inserted };
}

async function main() {
  const results: InsertResult[] = [];

  // Users
  results.push(await upsertAndReport('users', [
    {
      id: USER_1_ID,
      email: 'sarah.chen@example.com',
      name: 'Sarah Chen',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: USER_2_ID,
      email: 'marcus.wright@example.com',
      name: 'Marcus Wright',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ], 'id'));

  // Remove any finalized_plans rows for seeded events so the seed is fully idempotent.
  // HOST-9 in the QA checklist finalizes EVENT_2; without this cleanup the finalize INSERT
  // would fail with a unique-constraint error on subsequent runs.
  await db.from('finalized_plans').delete().in('event_id', [EVENT_1_ID, EVENT_2_ID, EVENT_3_ID]);

  // Events — fixed far-future dates so visual baselines don't drift between seed runs.
  const futureDate = '2030-07-04T19:00:00.000Z';
  const rsvpDeadline = '2030-06-27T23:59:59.000Z';

  results.push(await upsertAndReport('events', [
    {
      id: EVENT_1_ID,
      host_id: USER_1_ID,
      title: 'Team Dinner at Nobu',
      category: 'dinner',
      status: 'collecting',
      slug: 'seed-team-dinner-nobu',
      location_hint: 'New York, NY',
      template_id: 'dinner-default',
      proposed_date: futureDate,
      rsvp_deadline: rsvpDeadline,
      date_flexible: false,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: EVENT_2_ID,
      host_id: USER_2_ID,
      title: 'Escape Room Adventure',
      category: 'activity',
      status: 'deciding',
      slug: 'seed-escape-room-adventure',
      template_id: 'activity-default',
      proposed_date: futureDate,
      rsvp_deadline: rsvpDeadline,
      date_flexible: true,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
    {
      id: EVENT_3_ID,
      host_id: USER_1_ID,
      title: 'Birthday Dinner at Carbone',
      category: 'dinner',
      status: 'finalized',
      slug: 'seed-birthday-dinner-carbone',
      template_id: 'dinner-default',
      proposed_date: futureDate,
      rsvp_deadline: rsvpDeadline,
      date_flexible: false,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ], 'id', true));

  // Invitations
  results.push(await upsertAndReport('invitations', [
    {
      id: INV_1_ID,
      event_id: EVENT_1_ID,
      email: 'alice.johnson@example.com',
      name: 'Alice Johnson',
      status: 'accepted',
      invite_token: 'seed-token-inv1',
      slug: 'seed-inv-alice-dinner',
      responded_at: '2025-01-15T14:00:00.000Z',
      created_at: '2025-01-10T09:00:00.000Z',
      updated_at: '2025-01-15T14:00:00.000Z',
    },
    {
      id: INV_2_ID,
      event_id: EVENT_1_ID,
      email: 'bob.smith@example.com',
      name: 'Bob Smith',
      status: 'pending',
      invite_token: 'seed-token-inv2',
      slug: 'seed-inv-bob-dinner',
      created_at: '2025-01-10T09:05:00.000Z',
      updated_at: '2025-01-10T09:05:00.000Z',
    },
    {
      id: INV_3_ID,
      event_id: EVENT_2_ID,
      email: 'carol.davis@example.com',
      name: 'Carol Davis',
      status: 'accepted',
      invite_token: 'seed-token-inv3',
      slug: 'seed-inv-carol-escape',
      responded_at: '2025-01-15T15:00:00.000Z',
      created_at: '2025-01-10T09:10:00.000Z',
      updated_at: '2025-01-15T15:00:00.000Z',
    },
    {
      id: INV_4_ID,
      event_id: EVENT_2_ID,
      email: 'david.kim@example.com',
      name: 'David Kim',
      status: 'pending',
      invite_token: 'seed-token-inv4',
      slug: 'seed-inv-david-escape',
      created_at: '2025-01-10T09:15:00.000Z',
      updated_at: '2025-01-10T09:15:00.000Z',
    },
    {
      id: INV_5_ID,
      event_id: EVENT_3_ID,
      email: 'emma.wilson@example.com',
      name: 'Emma Wilson',
      status: 'accepted',
      invite_token: 'seed-token-inv5',
      slug: 'seed-inv-emma-birthday',
      responded_at: '2025-01-15T16:00:00.000Z',
      created_at: '2025-01-10T09:20:00.000Z',
      updated_at: '2025-01-15T16:00:00.000Z',
    },
  ], 'id', true));

  // Guest preferences for accepted invitations
  results.push(await upsertAndReport('guest_preferences', [
    {
      id: PREF_1_ID,
      event_id: EVENT_1_ID,
      invitation_id: INV_1_ID,
      dietary: ['vegetarian'],
      cuisine_prefs: ['Japanese', 'Italian'],
      cuisine_avoid: [],
      budget_min: 50,
      budget_max: 150,
      vibe_pref: 'upscale',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: PREF_2_ID,
      event_id: EVENT_2_ID,
      invitation_id: INV_3_ID,
      dietary: [],
      cuisine_prefs: ['Thai', 'Mexican'],
      cuisine_avoid: ['shellfish'],
      budget_min: 30,
      budget_max: 80,
      vibe_pref: 'casual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: PREF_3_ID,
      event_id: EVENT_3_ID,
      invitation_id: INV_5_ID,
      dietary: ['gluten-free'],
      cuisine_prefs: ['Italian', 'Mediterranean'],
      cuisine_avoid: [],
      budget_min: 80,
      budget_max: 200,
      vibe_pref: 'romantic',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ], 'id'));

  // Proposals for EVENT_2 (Escape Room, status: 'deciding') — required for vote page.
  // Inserted only if none exist to avoid duplicating on every seed run.
  const { data: existingProposals } = await db.from('proposals').select('id').eq('event_id', EVENT_2_ID).limit(1);
  if (!existingProposals?.length) {
    await db.from('proposals').insert([
      {
        id: PROP_1_ID,
        event_id: EVENT_2_ID,
        rank: 1,
        restaurant_name: 'Breakout NYC',
        restaurant_addr: '132 W 36th St, New York, NY 10018',
        cuisine_type: 'Experience',
        price_range: '$$',
        rating: 4.7,
        reasoning: 'Top-rated escape room venue with flexible group booking.',
        constraints_met: { budget: true, location: true },
        constraints_gap: {},
      },
      {
        id: PROP_2_ID,
        event_id: EVENT_2_ID,
        rank: 2,
        restaurant_name: 'The Escape Game NYC',
        restaurant_addr: '265 W 37th St, New York, NY 10018',
        cuisine_type: 'Experience',
        price_range: '$$',
        rating: 4.6,
        reasoning: 'Multiple room options, good for mixed groups.',
        constraints_met: { budget: true, location: true },
        constraints_gap: {},
      },
      {
        id: PROP_3_ID,
        event_id: EVENT_2_ID,
        rank: 3,
        restaurant_name: 'Komnata Quest',
        restaurant_addr: '225 W 35th St, New York, NY 10001',
        cuisine_type: 'Experience',
        price_range: '$',
        rating: 4.4,
        reasoning: 'Budget-friendly option with unique themed rooms.',
        constraints_met: { budget: true, location: false },
        constraints_gap: { location: 'Slightly further from transit' },
      },
    ]);
  }

  // AI logs
  results.push(await upsertAndReport('ai_logs', [
    {
      id: AILOG_1_ID,
      event_id: EVENT_1_ID,
      stage: 'constraint_extraction',
      model: 'claude-3-haiku-20240307',
      provider: 'anthropic',
      input_tokens: 450,
      output_tokens: 120,
      latency_ms: 820,
      cost_micros: 1200,
      created_at: new Date().toISOString(),
    },
    {
      id: AILOG_2_ID,
      event_id: EVENT_2_ID,
      stage: 'venue_scoring',
      model: 'gpt-4o-mini',
      provider: 'openai',
      input_tokens: 600,
      output_tokens: 200,
      latency_ms: 1100,
      cost_micros: 1800,
      created_at: new Date().toISOString(),
    },
    {
      id: AILOG_3_ID,
      event_id: EVENT_3_ID,
      stage: 'narrative_generation',
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      input_tokens: 800,
      output_tokens: 350,
      latency_ms: 2200,
      cost_micros: 4500,
      created_at: new Date().toISOString(),
    },
  ], 'id'));

  // Feature flags
  results.push(await upsertAndReport('feature_flags', [
    { flag_name: 'pipeline_v2', enabled: false, user_ids: [] },
    { flag_name: 'og_images', enabled: true, user_ids: [] },
  ], 'flag_name'));

  // Print summary
  console.log('\nSeed summary:');
  console.log('─'.repeat(50));
  for (const r of results) {
    console.log(`  ${r.table.padEnd(25)} inserted: ${r.inserted}  skipped: ${r.skipped}`);
  }
  console.log('─'.repeat(50));
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
