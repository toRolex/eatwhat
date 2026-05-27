import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { GET } from './route';
import { createClient } from '@/lib/supabase/server';

function makeChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  };
  return chain;
}

function makeAuthDb(user: { id: string } | null, profile: unknown) {
  const chain = makeChain({ data: profile, error: null });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockReturnValue(chain),
  };
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authenticated -> 200 { user: profile }', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb({ id: 'u1' }, { id: 'u1', name: 'Alice' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ user: { id: 'u1', name: 'Alice' } });
    expect(response.status).toBe(200);
  });

  it('unauthenticated -> 401', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null, null) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET();

    expect(response.status).toBe(401);
  });
});
