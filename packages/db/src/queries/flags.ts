import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export async function getFlag(
  db: SupabaseClient<Database>,
  flagName: string,
  userId?: string | null,
): Promise<boolean> {
  const { data } = await db
    .from('feature_flags')
    .select('enabled, user_ids')
    .eq('flag_name', flagName)
    .single();

  if (!data) return false;
  if (data.enabled) return true;
  if (userId && data.user_ids.includes(userId)) return true;
  return false;
}

export async function getAllFlags(db: SupabaseClient<Database>) {
  return db.from('feature_flags').select('*').order('flag_name');
}
