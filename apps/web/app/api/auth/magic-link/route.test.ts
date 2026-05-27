import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/funnel', () => ({
  track: vi.fn(),
}));

import { POST } from './route';
import { createClient } from '@/lib/supabase/server';

function makeAuthDb(otpError: Error | null) {
  return { auth: { signInWithOtp: vi.fn().mockResolvedValue({ error: otpError }) } };
}

describe('POST /api/auth/magic-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost';
  });

  it('valid email -> 200 { ok: true }', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await POST(new NextRequest('http://localhost/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    }));

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
  });

  it('missing email -> 400', async () => {
    const response = await POST(new NextRequest('http://localhost/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(400);
  });

  it('bad email format -> 400', async () => {
    const response = await POST(new NextRequest('http://localhost/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
    }));

    expect(response.status).toBe(400);
  });

  it('Supabase OTP error -> 400 with message', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(new Error('rate limited')) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await POST(new NextRequest('http://localhost/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    }));

    await expect(response.json()).resolves.toEqual({ error: 'rate limited' });
    expect(response.status).toBe(400);
  });

  it('path-traversal redirectTo ignored -> uses /dashboard', async () => {
    const authDb = makeAuthDb(null);
    vi.mocked(createClient).mockResolvedValue(
      authDb as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await POST(new NextRequest('http://localhost/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', redirectTo: '//evil.com' }),
    }));

    expect(response.status).toBe(200);
    expect(authDb.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: {
        emailRedirectTo: 'http://localhost/api/auth/callback?redirectTo=%2Fdashboard',
      },
    });
  });
});
