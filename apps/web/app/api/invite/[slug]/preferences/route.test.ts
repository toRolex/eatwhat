import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@groupplan/db', () => ({
  getInvitationBySlug: vi.fn(),
  getInvitationByToken: vi.fn(),
  upsertPreferences: vi.fn(),
  getEventById: vi.fn(),
}));

import { POST } from './route';
import { createServiceClient } from '@/lib/supabase/server';
import { getEventById, getInvitationBySlug, getInvitationByToken, upsertPreferences } from '@groupplan/db';

const validPreferencesBody = {
  dietary: [],
  cuisine_prefs: [],
  cuisine_avoid: [],
  budget_min: 20,
  budget_max: 50,
};

describe('POST /api/invite/[slug]/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn() } as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: { id: 'inv-1', event_id: 'evt-1', slug: 'my-event', status: 'accepted' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);
    vi.mocked(getInvitationByToken).mockResolvedValue({
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationByToken>>);
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', category: 'dinner' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);
    vi.mocked(upsertPreferences).mockResolvedValue({
      data: { id: 'pref-1' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof upsertPreferences>>);
  });

  it('valid preferences on accepted invitation -> 200', async () => {
    const response = await POST(new NextRequest('http://localhost/api/invite/my-event/preferences', {
      method: 'POST',
      body: JSON.stringify(validPreferencesBody),
    }), {
      params: Promise.resolve({ slug: 'my-event' }),
    });

    expect(response.status).toBe(200);
  });

  it('invalid slug -> 404', async () => {
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);
    vi.mocked(getInvitationByToken).mockResolvedValue({
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationByToken>>);

    const response = await POST(new NextRequest('http://localhost/api/invite/missing/preferences', {
      method: 'POST',
      body: JSON.stringify(validPreferencesBody),
    }), {
      params: Promise.resolve({ slug: 'missing' }),
    });

    expect(response.status).toBe(404);
  });

  it('invitation status pending -> 403', async () => {
    vi.mocked(getInvitationBySlug).mockResolvedValue({
      data: { id: 'inv-1', event_id: 'evt-1', slug: 'my-event', status: 'pending' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationBySlug>>);

    const response = await POST(new NextRequest('http://localhost/api/invite/my-event/preferences', {
      method: 'POST',
      body: JSON.stringify(validPreferencesBody),
    }), {
      params: Promise.resolve({ slug: 'my-event' }),
    });

    expect(response.status).toBe(403);
  });
});
