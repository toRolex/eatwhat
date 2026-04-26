import type { SupabaseClient } from '@supabase/supabase-js';

export async function getFinalizedPlanByEvent(db: SupabaseClient, eventId: string) {
  return db
    .from('finalized_plans')
    .select('*, proposals(restaurant_name, restaurant_addr, cuisine_type, price_range, rating, maps_url, image_url)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
}
