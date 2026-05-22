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
