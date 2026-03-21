import type { SupabaseClient } from '@supabase/supabase-js';

export interface InsertProposalRow {
  event_id: string;
  rank: 1 | 2 | 3;
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
