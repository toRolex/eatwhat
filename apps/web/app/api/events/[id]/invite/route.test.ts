import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@groupplan/db', () => ({
  getEventById: vi.fn(),
  createInvitations: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  getNotificationService: vi.fn().mockReturnValue(null),
  sendBatch: vi.fn(),
  appUrl: vi.fn().mockReturnValue('http://localhost'),
}));

vi.mock('@/lib/funnel', () => ({
  track: vi.fn(),
}));

import { POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { createInvitations, getEventById } from '@groupplan/db';

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

function makeAuthDb(user: { id: string; email?: string } | null) {
  const updateChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
  const selectChain = makeChain({ data: { name: 'Alice' }, error: null });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) =>
      table === 'events' ? updateChain : selectChain
    ),
    updateChain,
    selectChain,
  };
}

const context = { params: Promise.resolve({ id: 'evt-1' }) };

describe('POST /api/events/[id]/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb({ id: 'u1', email: 'alice@example.com' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'u1', status: 'open', slug: 'my-event', title: 'Dinner' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);
    vi.mocked(createInvitations).mockResolvedValue({
      data: [{ id: 'inv-1', name: 'Bob', email: 'bob@example.com', slug: 'bob-slug' }],
      error: null,
    } as unknown as Awaited<ReturnType<typeof createInvitations>>);
  });

  it('valid guests on open event -> 201', async () => {
    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/invite', {
      method: 'POST',
      body: JSON.stringify({ guests: [{ name: 'Bob', email: 'bob@example.com' }] }),
    }), context);

    expect(response.status).toBe(201);
  });

  it('event in draft status -> 422', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'u1', status: 'draft', slug: 'my-event', title: 'Dinner' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/invite', {
      method: 'POST',
      body: JSON.stringify({ guests: [{ name: 'Bob', email: 'bob@example.com' }] }),
    }), context);

    expect(response.status).toBe(422);
  });

  it('non-owner -> 404', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'other', status: 'open', slug: 'my-event', title: 'Dinner' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/invite', {
      method: 'POST',
      body: JSON.stringify({ guests: [{ name: 'Bob', email: 'bob@example.com' }] }),
    }), context);

    expect(response.status).toBe(404);
  });

  it('unauthenticated -> 401', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/invite', {
      method: 'POST',
      body: JSON.stringify({ guests: [{ name: 'Bob', email: 'bob@example.com' }] }),
    }), context);

    expect(response.status).toBe(401);
  });

  it('missing name in guest -> 400', async () => {
    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/invite', {
      method: 'POST',
      body: JSON.stringify({ guests: [{ email: 'bob@example.com' }] }),
    }), context);

    expect(response.status).toBe(400);
  });
});
