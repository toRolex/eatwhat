import { createClient } from '@supabase/supabase-js';

export interface RestaurantCacheRow {
  id: string;
  place_id: string;
  name: string;
  dietary_analysis: Record<string, unknown> | null;
  vibe_embedding: number[] | null;
  review_summary: string | null;
  menu_analysis: Record<string, unknown> | null;
  last_analyzed: string;
  ttl_days: number;
}

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Returns null if not cached or TTL expired (> 30 days)
export async function getCachedRestaurant(placeId: string): Promise<RestaurantCacheRow | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('restaurant_cache')
    .select('*')
    .eq('place_id', placeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const ageMs = Date.now() - new Date(data.last_analyzed).getTime();
  const ttlMs = data.ttl_days * 24 * 60 * 60 * 1000;
  if (ageMs > ttlMs) return null;

  return data as RestaurantCacheRow;
}

// Upserts by place_id, resets last_analyzed to now()
export async function setCachedRestaurant(
  placeId: string,
  analysis: Partial<RestaurantCacheRow>
): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.from('restaurant_cache').upsert(
    { ...analysis, place_id: placeId, last_analyzed: new Date().toISOString() },
    { onConflict: 'place_id' }
  );
  if (error) throw error;
}
