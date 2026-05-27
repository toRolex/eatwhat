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

import { POST } from './route';
import { createServiceClient } from '@/lib/supabase/server';
import { getEventById, getInvitationBySlug, getInvitationByToken } from '@groupplan/db';

function makeServiceDb(rsvpResult: unknown) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(rsvpResult),
  };
  return { from: vi.fn().mockReturnValue(chain), chain };
}

describe('POST /api/invite/[slug]/rsvp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceClient).mockReturnValue(
      makeServiceDb({ data: { id: 'inv-1', status: 'accepted' }, error: null }) as unknown as ReturnType<typeof createServiceClient>,
    );
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: { id: 'inv-1', event_id: 'evt-1', slug: 'my-event' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);
    vi.mocked(getInvitationByToken).mockResolvedValue({
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationByToken>>);
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', status: 'open', rsvp_deadline: new Date(Date.now() + 86_400_000).toISOString() },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);
  });

  it('valid { status: accepted } -> 200', async () => {
    const response = await POST(new NextRequest('http://localhost/api/invite/my-event/rsvp', {
      method: 'POST',
      body: JSON.stringify({ status: 'accepted' }),
    }), {
      params: Promise.resolve({ slug: 'my-event' }),
    });

    expect(response.status).toBe(200);
  });

  it('invalid status { status: maybe } -> 400', async () => {
    const response = await POST(new NextRequest('http://localhost/api/invite/my-event/rsvp', {
      method: 'POST',
      body: JSON.stringify({ status: 'maybe' }),
    }), {
      params: Promise.resolve({ slug: 'my-event' }),
    });

    expect(response.status).toBe(400);
  });

  it('invalid slug -> 404', async () => {
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);

    const response = await POST(new NextRequest('http://localhost/api/invite/missing/rsvp', {
      method: 'POST',
      body: JSON.stringify({ status: 'accepted' }),
    }), {
      params: Promise.resolve({ slug: 'missing' }),
    });

    expect(response.status).toBe(404);
  });

  it('past RSVP deadline -> 422', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', status: 'open', rsvp_deadline: new Date(Date.now() - 86_400_000).toISOString() },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/invite/my-event/rsvp', {
      method: 'POST',
      body: JSON.stringify({ status: 'accepted' }),
    }), {
      params: Promise.resolve({ slug: 'my-event' }),
    });

    expect(response.status).toBe(422);
  });

  it('event status finalized -> 422', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', status: 'finalized', rsvp_deadline: new Date(Date.now() + 86_400_000).toISOString() },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/invite/my-event/rsvp', {
      method: 'POST',
      body: JSON.stringify({ status: 'accepted' }),
    }), {
      params: Promise.resolve({ slug: 'my-event' }),
    });

    expect(response.status).toBe(422);
  });
});
