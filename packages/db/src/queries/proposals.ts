import type { SupabaseClient } from '@supabase/supabase-js';

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

export async function getProposalsByEvent(db: SupabaseClient, eventId: string) {
  return db
    .from('proposals')
    .select('*')
    .eq('event_id', eventId)
    .order('rank', { ascending: true });
}

export async function insertProposals(db: SupabaseClient, rows: InsertProposalRow[]) {
  return db.from('proposals').insert(rows).select();
}

// Replace all proposals for an event in one transaction-ish operation.
// Used when re-running AI synthesis so stale picks don't pile up.
export async function replaceProposals(db: SupabaseClient, eventId: string, rows: InsertProposalRow[]) {
  const { error: deleteError } = await db.from('proposals').delete().eq('event_id', eventId);
  if (deleteError) return { data: null, error: deleteError };
  return db.from('proposals').insert(rows).select();
}
