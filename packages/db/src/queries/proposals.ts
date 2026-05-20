import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../database.types';

export interface InsertProposalRow {
  event_id: string;
  rank: number;
  restaurant_name: string;
  restaurant_addr: string;
  cuisine_type: string;
  price_range: string;
  rating?: number;
  image_url?: string;
  maps_url?: string;
  booking_url?: string;
  reasoning: string;
  constraints_met: Record<string, boolean>;
  constraints_gap: Record<string, string>;
  suggested_time?: string;
}

type ProposalRow = Database['public']['Tables']['proposals']['Row'];
type ProposalRowsResult = Promise<{ data: ProposalRow[] | null; error: PostgrestError | null }>;

export async function getProposalsByEvent(db: SupabaseClient<Database>, eventId: string) {
  return db
    .from('proposals')
    .select('*')
    .eq('event_id', eventId)
    .order('rank', { ascending: true });
}

export async function insertProposals(db: SupabaseClient<Database>, rows: InsertProposalRow[]) {
  return db.from('proposals').insert(rows).select();
}

// Non-atomic: DELETE then INSERT as two separate PostgREST calls.
// Prefer replaceProposalsAndAdvance (RPC) for callers that also need status advance.
export async function replaceProposals(
  db: SupabaseClient<Database>,
  eventId: string,
  rows: InsertProposalRow[],
): ProposalRowsResult {
  const { error: deleteError } = await db.from('proposals').delete().eq('event_id', eventId);
  if (deleteError) return { data: null, error: deleteError };
  return db.from('proposals').insert(rows).select();
}

// InsertProposalRow[] is JSON-serializable; cast required for rpc() generic
export async function replaceProposalsAndAdvance(
  db: SupabaseClient<Database>,
  eventId: string,
  rows: InsertProposalRow[],
) {
  return db.rpc('replace_proposals_and_advance', {
    p_event_id: eventId,
    p_rows: rows as unknown as Json,
  });
}
