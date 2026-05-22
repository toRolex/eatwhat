import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { getInvitationBySlug } from './invitations';

function makeDb(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };

  return {
    db: { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient<Database>,
    chain,
  };
}

describe('getInvitationBySlug', () => {
  it('fetches one invitation by slug', async () => {
    const result = { data: { id: 'inv-1', slug: 'team-dinner-abcd1234' }, error: null };
    const { db, chain } = makeDb(result);

    await expect(getInvitationBySlug(db, 'team-dinner-abcd1234')).resolves.toBe(result);

    expect(db.from).toHaveBeenCalledWith('invitations');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.eq).toHaveBeenCalledWith('slug', 'team-dinner-abcd1234');
    expect(chain.single).toHaveBeenCalled();
  });

  it('returns the Supabase not-found result unchanged', async () => {
    const result = { data: null, error: { message: 'not found' } };
    const { db } = makeDb(result);

    await expect(getInvitationBySlug(db, 'missing')).resolves.toBe(result);
  });
});
