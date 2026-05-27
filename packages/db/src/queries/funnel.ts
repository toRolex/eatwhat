import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../database.types';

export async function trackFunnelEvent(
  db: SupabaseClient<Database>,
  payload: {
    event_name: string;
    user_id?: string | null;
    session_id?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  return db.from('funnel_events').insert({
    event_name: payload.event_name,
    user_id: payload.user_id ?? null,
    session_id: payload.session_id ?? null,
    metadata: (payload.metadata ?? {}) as Json,
  });
}

export async function getFunnelEvents(
  db: SupabaseClient<Database>,
  opts: { event_name?: string; limit?: number } = {},
) {
  let q = db
    .from('funnel_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 500);
  if (opts.event_name) q = q.eq('event_name', opts.event_name);
  return q;
}
