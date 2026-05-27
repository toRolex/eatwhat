import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@groupplan/db', () => ({
  upsertVote: vi.fn(),
}));

import { POST } from './route';
import { createServiceClient } from '@/lib/supabase/server';
import { upsertVote } from '@groupplan/db';

function makeServiceDb(opts: {
  invitation: unknown;
  event: unknown;
  proposal: unknown;
}) {
  function makeQueryChain(result: unknown) {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
    };
  }
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'invitations') return makeQueryChain(opts.invitation);
      if (table === 'events') return makeQueryChain(opts.event);
      return makeQueryChain(opts.proposal);
    }),
  };
}

const url = 'http://localhost/api/events/evt-1/proposals/prop-1/vote';
const context = { params: Promise.resolve({ id: 'evt-1', pid: 'prop-1' }) };

describe('POST /api/events/[id]/proposals/[pid]/vote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceClient).mockReturnValue(makeServiceDb({
      invitation: { data: { id: 'inv-1', status: 'accepted', event_id: 'evt-1' }, error: null },
      event: { data: { status: 'deciding' }, error: null },
      proposal: { data: { id: 'prop-1' }, error: null },
    }) as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(upsertVote).mockResolvedValue({
      data: { id: 'vote-1' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof upsertVote>>);
  });

  it('missing x-invite-token -> 401', async () => {
    const response = await POST(new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({ rank: 1 }),
    }), context);

    expect(response.status).toBe(401);
  });

  it('invitation not found -> 403', async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceDb({
      invitation: { data: null, error: null },
      event: { data: { status: 'deciding' }, error: null },
      proposal: { data: { id: 'prop-1' }, error: null },
    }) as unknown as ReturnType<typeof createServiceClient>);

    const response = await POST(new NextRequest(url, {
      method: 'POST',
      headers: { 'x-invite-token': 'my-event' },
      body: JSON.stringify({ rank: 1 }),
    }), context);

    expect(response.status).toBe(403);
  });

  it('invitation not accepted -> 403', async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceDb({
      invitation: { data: { id: 'inv-1', status: 'pending', event_id: 'evt-1' }, error: null },
      event: { data: { status: 'deciding' }, error: null },
      proposal: { data: { id: 'prop-1' }, error: null },
    }) as unknown as ReturnType<typeof createServiceClient>);

    const response = await POST(new NextRequest(url, {
      method: 'POST',
      headers: { 'x-invite-token': 'my-event' },
      body: JSON.stringify({ rank: 1 }),
    }), context);

    expect(response.status).toBe(403);
  });

  it('token belongs to different event -> 403', async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceDb({
      invitation: { data: { id: 'inv-1', status: 'accepted', event_id: 'other-evt' }, error: null },
      event: { data: { status: 'deciding' }, error: null },
      proposal: { data: { id: 'prop-1' }, error: null },
    }) as unknown as ReturnType<typeof createServiceClient>);

    const response = await POST(new NextRequest(url, {
      method: 'POST',
      headers: { 'x-invite-token': 'my-event' },
      body: JSON.stringify({ rank: 1 }),
    }), context);

    expect(response.status).toBe(403);
  });

  it('event not deciding -> 409', async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceDb({
      invitation: { data: { id: 'inv-1', status: 'accepted', event_id: 'evt-1' }, error: null },
      event: { data: { status: 'collecting' }, error: null },
      proposal: { data: { id: 'prop-1' }, error: null },
    }) as unknown as ReturnType<typeof createServiceClient>);

    const response = await POST(new NextRequest(url, {
      method: 'POST',
      headers: { 'x-invite-token': 'my-event' },
      body: JSON.stringify({ rank: 1 }),
    }), context);

    expect(response.status).toBe(409);
  });

  it('proposal not found -> 404', async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeServiceDb({
      invitation: { data: { id: 'inv-1', status: 'accepted', event_id: 'evt-1' }, error: null },
      event: { data: { status: 'deciding' }, error: null },
      proposal: { data: null, error: null },
    }) as unknown as ReturnType<typeof createServiceClient>);

    const response = await POST(new NextRequest(url, {
      method: 'POST',
      headers: { 'x-invite-token': 'my-event' },
      body: JSON.stringify({ rank: 1 }),
    }), context);

    expect(response.status).toBe(404);
  });

  it('valid vote -> 200', async () => {
    const response = await POST(new NextRequest(url, {
      method: 'POST',
      headers: { 'x-invite-token': 'my-event' },
      body: JSON.stringify({ rank: 1 }),
    }), context);

    await expect(response.json()).resolves.toEqual({ vote: { id: 'vote-1' } });
    expect(response.status).toBe(200);
  });
});
