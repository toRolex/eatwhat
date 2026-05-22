import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock('@groupplan/db', () => ({
  getEventById: vi.fn(),
  getInvitationBySlug: vi.fn(),
  getInvitationByToken: vi.fn(),
}));

import { POST } from './route';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getEventById, getInvitationBySlug, getInvitationByToken } from '@groupplan/db';

function makeServiceDb() {
  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: vi.fn().mockReturnValue(updateChain),
    updateChain,
  };
}

function makeAuthDb(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  };
}

describe('POST /api/invite/[slug]/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEventById).mockResolvedValue({
      data: { status: 'collecting', rsvp_deadline: new Date(Date.now() + 86_400_000).toISOString() },
    } as unknown as Awaited<ReturnType<typeof getEventById>>);
  });

  it('returns 404 when invitation is not found', async () => {
    const serviceDb = makeServiceDb();
    vi.mocked(createServiceClient).mockReturnValue(serviceDb as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(createClient).mockResolvedValue(makeAuthDb(null) as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getInvitationBySlug).mockResolvedValue({ data: null } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);
    vi.mocked(getInvitationByToken).mockResolvedValue({ data: null } as unknown as Awaited<ReturnType<typeof getInvitationByToken>>);

    const response = await POST(new NextRequest('http://localhost/api/invite/missing/accept'), {
      params: Promise.resolve({ slug: 'missing' }),
    });

    await expect(response.json()).resolves.toEqual({ error: 'Not found' });
    expect(response.status).toBe(404);
    expect(serviceDb.from).not.toHaveBeenCalled();
  });

  it('accepts and redirects authenticated users', async () => {
    const serviceDb = makeServiceDb();
    vi.mocked(createServiceClient).mockReturnValue(serviceDb as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(createClient).mockResolvedValue(makeAuthDb({ id: 'user-1' }) as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: { id: 'inv-1', event_id: 'event-1', slug: 'team-dinner-abcd1234', status: 'pending' },
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);

    const response = await POST(new NextRequest('http://localhost/api/invite/team-dinner-abcd1234/accept'), {
      params: Promise.resolve({ slug: 'team-dinner-abcd1234' }),
    });

    await expect(response.json()).resolves.toEqual({ redirect: '/invite/team-dinner-abcd1234/confirmed' });
    expect(serviceDb.from).toHaveBeenCalledWith('invitations');
    expect(serviceDb.updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'accepted',
      user_id: 'user-1',
    }));
    expect(serviceDb.updateChain.eq).toHaveBeenCalledWith('id', 'inv-1');
  });

  it('accepts unauthenticated guests without requiring a user_id', async () => {
    const serviceDb = makeServiceDb();
    vi.mocked(createServiceClient).mockReturnValue(serviceDb as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(createClient).mockResolvedValue(makeAuthDb(null) as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: { id: 'inv-1', event_id: 'event-1', slug: 'team-dinner-abcd1234', status: 'pending' },
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);

    const response = await POST(new NextRequest('http://localhost/api/invite/team-dinner-abcd1234/accept'), {
      params: Promise.resolve({ slug: 'team-dinner-abcd1234' }),
    });

    await expect(response.json()).resolves.toEqual({ redirect: '/invite/team-dinner-abcd1234/confirmed' });
    expect(serviceDb.updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'accepted',
    }));
    expect(serviceDb.updateChain.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ user_id: expect.anything() }),
    );
  });

  it('accepts legacy token links and redirects to the canonical slug', async () => {
    const serviceDb = makeServiceDb();
    const legacyToken = 'a'.repeat(64);
    vi.mocked(createServiceClient).mockReturnValue(serviceDb as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(createClient).mockResolvedValue(makeAuthDb({ id: 'user-1' }) as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getInvitationByToken).mockResolvedValue({
      data: { id: 'inv-1', event_id: 'event-1', slug: 'team-dinner-abcd1234', status: 'pending' },
    } as unknown as Awaited<ReturnType<typeof getInvitationByToken>>);

    const response = await POST(new NextRequest(`http://localhost/api/invite/${legacyToken}/accept`), {
      params: Promise.resolve({ slug: legacyToken }),
    });

    await expect(response.json()).resolves.toEqual({ redirect: '/invite/team-dinner-abcd1234/confirmed' });
    expect(getInvitationByToken).toHaveBeenCalledWith(serviceDb, legacyToken);
    expect(serviceDb.updateChain.eq).toHaveBeenCalledWith('id', 'inv-1');
  });

  it('rejects pending accepts after the RSVP deadline', async () => {
    const serviceDb = makeServiceDb();
    vi.mocked(createServiceClient).mockReturnValue(serviceDb as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(createClient).mockResolvedValue(makeAuthDb({ id: 'user-1' }) as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: { id: 'inv-1', event_id: 'event-1', slug: 'team-dinner-abcd1234', status: 'pending' },
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);
    vi.mocked(getEventById).mockResolvedValue({
      data: { status: 'collecting', rsvp_deadline: new Date(Date.now() - 86_400_000).toISOString() },
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/invite/team-dinner-abcd1234/accept'), {
      params: Promise.resolve({ slug: 'team-dinner-abcd1234' }),
    });

    await expect(response.json()).resolves.toEqual({ error: 'RSVP deadline has passed' });
    expect(response.status).toBe(422);
    expect(serviceDb.from).not.toHaveBeenCalled();
  });

  it('rejects pending accepts when the event is no longer collecting RSVPs', async () => {
    const serviceDb = makeServiceDb();
    vi.mocked(createServiceClient).mockReturnValue(serviceDb as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(createClient).mockResolvedValue(makeAuthDb({ id: 'user-1' }) as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: { id: 'inv-1', event_id: 'event-1', slug: 'team-dinner-abcd1234', status: 'pending' },
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);
    vi.mocked(getEventById).mockResolvedValue({
      data: { status: 'finalized', rsvp_deadline: new Date(Date.now() + 86_400_000).toISOString() },
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/invite/team-dinner-abcd1234/accept'), {
      params: Promise.resolve({ slug: 'team-dinner-abcd1234' }),
    });

    await expect(response.json()).resolves.toEqual({ error: 'RSVPs are no longer being accepted for this event' });
    expect(response.status).toBe(422);
    expect(serviceDb.from).not.toHaveBeenCalled();
  });
});
