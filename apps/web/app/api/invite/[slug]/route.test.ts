import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@groupplan/db', () => ({
  getInvitationBySlug: vi.fn(),
  getInvitationByToken: vi.fn(),
  getEventById: vi.fn(),
}));

import { GET } from './route';
import { createServiceClient } from '@/lib/supabase/server';
import { getEventById, getInvitationBySlug, getInvitationByToken } from '@groupplan/db';

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

function makeServiceDb(hostResult: unknown) {
  const chain = makeChain({ data: hostResult, error: null });
  return { from: vi.fn().mockReturnValue(chain) };
}

describe('GET /api/invite/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceDb({ name: 'Alice', avatar_url: null }) as unknown as ReturnType<typeof createServiceClient>,
    );
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: { id: 'inv-1', event_id: 'evt-1', slug: 'my-event-abc12' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);
    vi.mocked(getInvitationByToken).mockResolvedValue({
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationByToken>>);
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'u1', title: 'Dinner' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);
  });

  it('valid slug -> 200 { invitation, event, host }', async () => {
    const response = await GET(new NextRequest('http://localhost/api/invite/my-event-abc12'), {
      params: Promise.resolve({ slug: 'my-event-abc12' }),
    });

    await expect(response.json()).resolves.toEqual({
      invitation: { id: 'inv-1', event_id: 'evt-1', slug: 'my-event-abc12' },
      event: { id: 'evt-1', host_id: 'u1', title: 'Dinner' },
      host: { name: 'Alice', avatar_url: null },
    });
    expect(response.status).toBe(200);
  });

  it('invalid slug -> 404', async () => {
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);

    const response = await GET(new NextRequest('http://localhost/api/invite/missing'), {
      params: Promise.resolve({ slug: 'missing' }),
    });

    expect(response.status).toBe(404);
  });

  it('event not found -> 404', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await GET(new NextRequest('http://localhost/api/invite/my-event-abc12'), {
      params: Promise.resolve({ slug: 'my-event-abc12' }),
    });

    expect(response.status).toBe(404);
  });

  it('64-char slug routes through getInvitationByToken', async () => {
    const slug = 'a'.repeat(64);
    vi.mocked(getInvitationByToken).mockResolvedValue({
      data: { id: 'inv-1', event_id: 'evt-1', slug: 'my-event-abc12' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationByToken>>);

    const response = await GET(new NextRequest(`http://localhost/api/invite/${slug}`), {
      params: Promise.resolve({ slug }),
    });

    expect(response.status).toBe(200);
    expect(getInvitationByToken).toHaveBeenCalledWith(expect.anything(), slug);
    expect(getInvitationBySlug).not.toHaveBeenCalled();
  });
});
