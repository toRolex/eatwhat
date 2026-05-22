import { cache } from 'react';
import { createServiceClient } from '@/lib/supabase/server';
import { getFlag as _getFlag } from '@groupplan/db';

export const getFlag = cache(async (flagName: string, userId?: string | null): Promise<boolean> => {
  try {
    const db = createServiceClient();
    return await _getFlag(db, flagName, userId);
  } catch {
    return false;
  }
});
