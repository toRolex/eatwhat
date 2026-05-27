import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock('@groupplan/db', () => ({
  getEventById: vi.fn(),
  getPreferencesByEvent: vi.fn(),
  replaceProposalsAndAdvance: vi.fn(),
  getInvitationsByEvent: vi.fn(),
  logUsage: vi.fn(),
  getMonthlySpendByEvent: vi.fn(),
  getSpendSince: vi.fn(),
}));

vi.mock('@groupplan/ai', () => ({
  ClaudeAIProvider: vi.fn(),
  runPipeline: vi.fn(),
}));

vi.mock('@groupplan/venues', () => ({
  GooglePlacesVenueProvider: vi.fn(),
  YelpVenueProvider: vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  ensureEnvLoaded: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  getNotificationService: vi.fn().mockReturnValue(null),
  sendBatch: vi.fn(),
  appUrl: vi.fn().mockReturnValue('http://localhost'),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}));

import { POST } from './route';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getEventById, getPreferencesByEvent } from '@groupplan/db';
import { rateLimit } from '@/lib/rate-limit';

function makeAuthDb(user: { id: string } | null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } };
}

const context = { params: Promise.resolve({ id: 'evt-1' }) };

describe('POST /api/events/[id]/trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PIPELINE_V2;
    vi.mocked(rateLimit).mockReturnValue({ ok: true, remaining: 9, retryAfterSec: 0 });
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb({ id: 'u1' }) as unknown as Awaited<ReturnType<typeof createClient>>,
    );
    vi.mocked(createServiceClient).mockReturnValue({} as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'u1', status: 'collecting', title: 'Dinner', location_hint: 'NYC' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);
    vi.mocked(getPreferencesByEvent).mockResolvedValue({
      data: [{ id: 'p1' }],
      error: null,
    } as unknown as Awaited<ReturnType<typeof getPreferencesByEvent>>);
  });

  it('unauthenticated -> 401', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeAuthDb(null) as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/trigger', {
      method: 'POST',
      body: JSON.stringify({}),
    }), context);

    expect(response.status).toBe(401);
  });

  it('non-owner -> 404', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'other', status: 'collecting', title: 'Dinner', location_hint: 'NYC' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/trigger', {
      method: 'POST',
      body: JSON.stringify({}),
    }), context);

    expect(response.status).toBe(404);
  });

  it('event status draft -> 422', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'u1', status: 'draft', title: 'Dinner', location_hint: 'NYC' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/trigger', {
      method: 'POST',
      body: JSON.stringify({}),
    }), context);

    expect(response.status).toBe(422);
  });

  it('event deciding without confirm_rerun -> 409 with code rerun_confirmation_required', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'u1', status: 'deciding', title: 'Dinner', location_hint: 'NYC' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/trigger', {
      method: 'POST',
      body: JSON.stringify({}),
    }), context);

    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      code: 'rerun_confirmation_required',
    }));
    expect(response.status).toBe(409);
  });

  it('no preferences -> 422 message includes No preferences', async () => {
    vi.mocked(getPreferencesByEvent).mockResolvedValue({
      data: [],
      error: null,
    } as unknown as Awaited<ReturnType<typeof getPreferencesByEvent>>);

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/trigger', {
      method: 'POST',
      body: JSON.stringify({}),
    }), context);

    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      error: expect.stringContaining('No preferences'),
    }));
    expect(response.status).toBe(422);
  });

  it('no location -> 422 message includes No location', async () => {
    vi.mocked(getEventById).mockResolvedValue({
      data: { id: 'evt-1', host_id: 'u1', status: 'collecting', title: 'Dinner', location_hint: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getEventById>>);

    const response = await POST(new NextRequest('http://localhost/api/events/evt-1/trigger', {
      method: 'POST',
      body: JSON.stringify({}),
    }), context);

    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      error: expect.stringContaining('No location'),
    }));
    expect(response.status).toBe(422);
  });
});
