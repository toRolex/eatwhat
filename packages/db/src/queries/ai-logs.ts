import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export async function getAiLogsByEvent(db: SupabaseClient<Database>, eventId: string) {
  return db
    .from('ai_logs')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
}

export async function getRecentAiLogs(
  db: SupabaseClient<Database>,
  options: { limit?: number; stage?: string } = {},
) {
  let q = db
    .from('ai_logs')
    .select('*, events(title)')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 200);
  if (options.stage) q = q.eq('stage', options.stage);
  return q;
}

export async function getMonthlySpendByEvent(
  db: SupabaseClient<Database>,
  eventId: string,
): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data, error } = await db
    .from('ai_logs')
    .select('cost_micros')
    .eq('event_id', eventId)
    .gte('created_at', startOfMonth.toISOString());

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + (row.cost_micros ?? 0), 0);
}

export async function getSpendSince(
  db: SupabaseClient<Database>,
  eventId: string,
  since: Date,
): Promise<number> {
  const { data, error } = await db
    .from('ai_logs')
    .select('cost_micros')
    .eq('event_id', eventId)
    .gte('created_at', since.toISOString());

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + (row.cost_micros ?? 0), 0);
}
