import { cache } from 'react';
import { getFlag as _getFlag } from '@/lib/db';

export const getFlag = cache(async (flagName: string, userId?: string | null): Promise<boolean> => {
  try {
    return _getFlag(flagName, userId);
  } catch {
    return false;
  }
});
