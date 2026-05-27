import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@groupplan/db', () => ({
  createEvent: vi.fn(),
  getEventsByHost: vi.fn(),
}));

import { GET, POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { createEvent, getEventsByHost } from '@groupplan/db';

function makeAuthDb(user: { id: string } | null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } };
}

const validEventBody = {
  title: 'Dinner',
  template_id: 'classic',
  date_flexible: true,
  rsvp_deadline: '2026-12-01T00:00:00.000Z',
};

describe('/api/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET authenticated with events -> 200 { events }', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb({ id: 'u1' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(getEventsByHost).mockResolvedValue({
      data: [{ id: 'e1' }],
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventsByHost>>);

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ events: [{ id: 'e1' }] });
    expect(response.status).toBe(200);
  });

  it('GET unauthenticated -> 401', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it('POST valid body -> 201 { event }', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb({ id: 'u1' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(createEvent).mockResolvedValue({
      data: { id: 'e1', title: 'Dinner' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof createEvent>>);

    const response = await POST(new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify(validEventBody),
    }));

    await expect(response.json()).resolves.toEqual({ event: { id: 'e1', title: 'Dinner' } });
    expect(response.status).toBe(201);
  });

  it('POST missing title -> 400', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb({ id: 'u1' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await POST(new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({ ...validEventBody, title: undefined }),
    }));

    expect(response.status).toBe(400);
  });

  it('POST missing rsvp_deadline -> 400', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb({ id: 'u1' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await POST(new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify({ title: 'Dinner', template_id: 'classic', date_flexible: true }),
    }));

    expect(response.status).toBe(400);
  });

  it('POST unauthenticated -> 401', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await POST(new NextRequest('http://localhost/api/events', {
      method: 'POST',
      body: JSON.stringify(validEventBody),
    }));

    expect(response.status).toBe(401);
  });
});
