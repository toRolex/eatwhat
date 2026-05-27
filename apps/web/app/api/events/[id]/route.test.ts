import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@groupplan/db', () => ({
  getEventById: vi.fn(),
  updateEvent: vi.fn(),
  updateEventStatus: vi.fn(),
  deleteEvent: vi.fn(),
}));

import { DELETE, GET, PATCH } from './route';
import { createClient } from '@/lib/supabase/server';
import { deleteEvent, getEventById, updateEvent, updateEventStatus } from '@groupplan/db';

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

function makeAuthDb(user: { id: string } | null) {
  const chain = makeChain({ data: null, error: null });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockReturnValue(chain),
  };
}

const context = { params: Promise.resolve({ id: 'evt-1' }) };

describe('/api/events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb({ id: 'u1' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'u1', title: 'Dinner', status: 'collecting' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);
  });

  it('GET event found -> 200', async () => {
    const response = await GET(new NextRequest('http://localhost/api/events/evt-1'), context);

    expect(response.status).toBe(200);
  });

  it('GET event not found -> 404', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: null,
      error: new Error('not found'),
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await GET(new NextRequest('http://localhost/api/events/evt-1'), context);

    expect(response.status).toBe(404);
  });

  it('PATCH valid title patch -> 200', async () => {
    vi.mocked(updateEvent).mockResolvedValue({
      data: { id: 'evt-1', title: 'New Title' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof updateEvent>>);

    const response = await PATCH(new NextRequest('http://localhost/api/events/evt-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New Title' }),
    }), context);

    await expect(response.json()).resolves.toEqual({ event: { id: 'evt-1', title: 'New Title' } });
    expect(response.status).toBe(200);
  });

  it('PATCH non-owner -> 404', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'other-user', title: 'Dinner', status: 'collecting' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await PATCH(new NextRequest('http://localhost/api/events/evt-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New Title' }),
    }), context);

    expect(response.status).toBe(404);
  });

  it('PATCH unauthenticated -> 401', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await PATCH(new NextRequest('http://localhost/api/events/evt-1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'New Title' }),
    }), context);

    expect(response.status).toBe(401);
  });

  it('PATCH valid status transition collecting->deciding -> 200', async () => {
    vi.mocked(updateEventStatus).mockResolvedValue({
      data: { id: 'evt-1', status: 'deciding' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof updateEventStatus>>);

    const response = await PATCH(new NextRequest('http://localhost/api/events/evt-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'deciding' }),
    }), context);

    await expect(response.json()).resolves.toEqual({ event: { id: 'evt-1', status: 'deciding' } });
    expect(response.status).toBe(200);
  });

  it('PATCH invalid status transition -> 422', async () => {
    const response = await PATCH(new NextRequest('http://localhost/api/events/evt-1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'finalized' }),
    }), context);

    expect(response.status).toBe(422);
  });

  it('DELETE owner -> 204', async () => {
    vi.mocked(deleteEvent).mockResolvedValue({
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof deleteEvent>>);

    const response = await DELETE(new NextRequest('http://localhost/api/events/evt-1'), context);

    expect(response.status).toBe(204);
  });

  it('DELETE non-owner -> 404', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'other-user', title: 'Dinner', status: 'collecting' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await DELETE(new NextRequest('http://localhost/api/events/evt-1'), context);

    expect(response.status).toBe(404);
  });

  it('DELETE unauthenticated -> 401', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await DELETE(new NextRequest('http://localhost/api/events/evt-1'), context);

    expect(response.status).toBe(401);
  });
});
