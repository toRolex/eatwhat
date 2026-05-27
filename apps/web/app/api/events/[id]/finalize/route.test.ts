import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@groupplan/db', () => ({
  getEventById: vi.fn(),
  getInvitationsByEvent: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  getNotificationService: vi.fn().mockReturnValue(null),
  sendBatch: vi.fn(),
  appUrl: vi.fn().mockReturnValue('http://localhost'),
}));

vi.mock('@/lib/scoring', () => ({
  DINNER_DURATION_MS: 5400000,
}));

import { POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { getEventById, getInvitationsByEvent } from '@groupplan/db';

function makeAuthDb(
  user: { id: string } | null,
  proposalResult: unknown,
  planResult: unknown,
) {
  const proposalChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(proposalResult),
  };
  const planChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(planResult),
  };
  const eventsChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'proposals') return proposalChain;
      if (table === 'finalized_plans') return planChain;
      return eventsChain;
    }),
  };
}

const proposalId = '00000000-0000-4000-8000-000000000001';
const validFinalizeBody = {
  proposal_id: proposalId,
  confirmed_time: '2026-12-01T19:00:00.000Z',
};
const context = { params: Promise.resolve({ id: 'evt-1' }) };

describe('POST /api/events/[id]/finalize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(
        { id: 'u1' },
        { data: { id: proposalId, restaurant_name: 'Chez Test', restaurant_addr: '1 Main St' }, error: null },
        { data: { id: 'plan-1' }, error: null },
      ) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'u1', status: 'deciding', title: 'Dinner' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);
    vi.mocked(getInvitationsByEvent).mockResolvedValue({
      data: [],
      error: null,
    } as unknown as Awaited<ReturnType<typeof getInvitationsByEvent>>);
  });

  it('valid finalize -> 200', async () => {
    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/finalize', {
      method: 'POST',
      body: JSON.stringify(validFinalizeBody),
    }), context);

    expect(response.status).toBe(200);
  });

  it('event not deciding -> 422', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'u1', status: 'collecting', title: 'Dinner' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/finalize', {
      method: 'POST',
      body: JSON.stringify(validFinalizeBody),
    }), context);

    expect(response.status).toBe(422);
  });

  it('proposal not found -> 404', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(
        { id: 'u1' },
        { data: null, error: null },
        { data: { id: 'plan-1' }, error: null },
      ) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/finalize', {
      method: 'POST',
      body: JSON.stringify(validFinalizeBody),
    }), context);

    expect(response.status).toBe(404);
  });

  it('non-owner -> 404', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'other', status: 'deciding', title: 'Dinner' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/finalize', {
      method: 'POST',
      body: JSON.stringify(validFinalizeBody),
    }), context);

    expect(response.status).toBe(404);
  });

  it('unauthenticated -> 401', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(
        null,
        { data: { id: proposalId, restaurant_name: 'Chez Test', restaurant_addr: '1 Main St' }, error: null },
        { data: { id: 'plan-1' }, error: null },
      ) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/finalize', {
      method: 'POST',
      body: JSON.stringify(validFinalizeBody),
    }), context);

    expect(response.status).toBe(401);
  });
});
