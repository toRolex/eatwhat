import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/funnel', () => ({
  track: vi.fn(),
}));

import { GET } from './route';
import { createClient } from '@/lib/supabase/server';

function makeAuthDb(
  exchangeError: Error | null,
  user: { id: string } | null = null,
  verifyOtpError: Error | null = null,
) {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: exchangeError }),
      verifyOtp: vi.fn().mockResolvedValue({ error: verifyOtpError }),
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  };
}

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves invite context when an invite magic link is expired', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(new Error('expired')) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET(new Request(
      'http://localhost/api/auth/callback?code=abc&redirectTo=%2Finvite%2Fteam-dinner-abcd1234%2Fconfirmed',
    ));

    expect(response.headers.get('location')).toBe(
      'http://localhost/login?error=link-expired&from=invite&slug=team-dinner-abcd1234',
    );
  });

  it('redirects invalid non-invite magic links to the login error state', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(new Error('expired')) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET(new Request(
      'http://localhost/api/auth/callback?code=abc&redirectTo=%2Fdashboard',
    ));

    expect(response.headers.get('location')).toBe('http://localhost/login?error=link-expired');
  });

  it('keeps safe successful redirects unchanged', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null, { id: 'user-1' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET(new Request(
      'http://localhost/api/auth/callback?code=abc&redirectTo=%2Finvite%2Fteam-dinner-abcd1234%2Fconfirmed',
    ));

    expect(response.headers.get('location')).toBe(
      'http://localhost/invite/team-dinner-abcd1234/confirmed',
    );
  });

  it('redirects cross-browser magic link errors to login', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null, null, new Error('expired')) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET(new Request(
      'http://localhost/api/auth/callback?token_hash=abc&type=magiclink&redirectTo=%2Fdashboard',
    ));

    expect(response.headers.get('location')).toBe('http://localhost/login?error=link-expired');
  });

  it('verifies token_hash flow successfully and redirects', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null, { id: 'user-2' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET(new Request(
      'http://localhost/api/auth/callback?token_hash=abc&type=magiclink&redirectTo=%2Fdashboard',
    ));

    expect(response.headers.get('location')).toBe('http://localhost/dashboard');
  });

  it('rejects unsupported token_hash types before verification', async () => {
    const authDb = makeAuthDb(null, { id: 'user-2' });
    vi.mocked(createClient).mockResolvedValue(
      authDb as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET(new Request(
      'http://localhost/api/auth/callback?token_hash=abc&type=recovery&redirectTo=%2Fdashboard',
    ));

    expect(authDb.auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('http://localhost/login?error=link-expired');
  });
});
