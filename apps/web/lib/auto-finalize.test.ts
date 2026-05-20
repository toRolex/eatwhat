import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }));
vi.mock('@groupplan/db', () => ({
  getProposalsByEvent: vi.fn(),
  getVotesByEvent: vi.fn(),
  getInvitationsByEvent: vi.fn(),
}));
vi.mock('@/lib/notifications', () => ({
  getNotificationService: vi.fn(),
  sendBatch: vi.fn().mockResolvedValue({ sent: 1, failed: 0, errors: [] }),
  appUrl: vi.fn().mockReturnValue('http://localhost:3000'),
}));

import { maybeAutoFinalize } from './auto-finalize';
import { createServiceClient } from '@/lib/supabase/server';
import { getProposalsByEvent, getVotesByEvent, getInvitationsByEvent } from '@groupplan/db';
import { getNotificationService, sendBatch } from '@/lib/notifications';

const EVENT_ID = 'event-1';
const WINNER_ID = 'proposal-1';

const BASE_EVENT = {
  id: EVENT_ID,
  title: 'Team Dinner',
  status: 'deciding',
  vote_deadline: new Date(Date.now() - 60_000).toISOString(),
  proposed_date: '2026-07-01T19:00:00.000Z',
};

const PROPOSALS = [
  { id: 'proposal-1', restaurant_name: 'Sushi Spot', restaurant_addr: '1 Main St', suggested_time: null },
  { id: 'proposal-2', restaurant_name: 'Pizza Place', restaurant_addr: '2 Elm St', suggested_time: null },
];

const VOTES = [
  { proposal_id: 'proposal-1', invitation_id: 'inv-1', rank: 1 },
  { proposal_id: 'proposal-2', invitation_id: 'inv-1', rank: 2 },
];

const INVITATIONS = [
  { id: 'inv-1', name: 'Alice', email: 'alice@example.com', status: 'accepted' },
  { id: 'inv-2', name: 'Bob', email: 'bob@example.com', status: 'pending' },
];

function makeDb(opts: { event?: object | null; flipResult?: object | null } = {}) {
  const event = opts.event !== undefined ? opts.event : BASE_EVENT;
  const flipResult = opts.flipResult !== undefined ? opts.flipResult : { id: EVENT_ID };
  const singleMock = vi.fn()
    .mockResolvedValueOnce({ data: event })
    .mockResolvedValueOnce({ data: flipResult });
  const chainable = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    eq: vi.fn().mockReturnThis(),
    single: singleMock,
  };
  return { from: vi.fn().mockReturnValue(chainable), _chainable: chainable };
}

describe('maybeAutoFinalize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const defaultDb = makeDb();
    vi.mocked(createServiceClient).mockReturnValue(defaultDb as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(getProposalsByEvent).mockResolvedValue({ data: PROPOSALS } as Awaited<ReturnType<typeof getProposalsByEvent>>);
    vi.mocked(getVotesByEvent).mockResolvedValue({ data: VOTES } as Awaited<ReturnType<typeof getVotesByEvent>>);
    vi.mocked(getInvitationsByEvent).mockResolvedValue({ data: INVITATIONS } as Awaited<ReturnType<typeof getInvitationsByEvent>>);
    vi.mocked(getNotificationService).mockReturnValue({ notify: vi.fn() });
  });

  it('returns false when event is not found', async () => {
    const db = makeDb({ event: null });
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>);

    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when event status is not deciding', async () => {
    const db = makeDb({ event: { ...BASE_EVENT, status: 'open' } });
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>);

    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when vote_deadline is null', async () => {
    const db = makeDb({ event: { ...BASE_EVENT, vote_deadline: null } });
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>);

    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when vote_deadline is in the future', async () => {
    const db = makeDb({ event: { ...BASE_EVENT, vote_deadline: new Date(Date.now() + 60_000).toISOString() } });
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>);

    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when there are no proposals', async () => {
    vi.mocked(getProposalsByEvent).mockResolvedValueOnce({ data: [] } as unknown as Awaited<ReturnType<typeof getProposalsByEvent>>);

    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when all Borda scores are zero (no votes)', async () => {
    vi.mocked(getVotesByEvent).mockResolvedValueOnce({ data: [] } as Awaited<ReturnType<typeof getVotesByEvent>>);

    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when no confirmed_time is available', async () => {
    const db = makeDb({ event: { ...BASE_EVENT, proposed_date: null } });
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(getVotesByEvent).mockResolvedValueOnce({ data: VOTES } as Awaited<ReturnType<typeof getVotesByEvent>>);

    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns false when concurrent-write guard fails', async () => {
    const db = makeDb({ flipResult: null });
    vi.mocked(createServiceClient).mockReturnValue(db as unknown as ReturnType<typeof createServiceClient>);

    await expect(maybeAutoFinalize(EVENT_ID)).resolves.toBe(false);
  });

  it('returns true and inserts finalized_plan with correct fields', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    const singleMock = vi.fn()
      .mockResolvedValueOnce({ data: BASE_EVENT })
      .mockResolvedValueOnce({ data: { id: EVENT_ID } });
    const dbWithSpy = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: insertSpy,
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
      }),
    };
    vi.mocked(createServiceClient).mockReturnValue(dbWithSpy as unknown as ReturnType<typeof createServiceClient>);

    const result = await maybeAutoFinalize(EVENT_ID);

    expect(result).toBe(true);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
      event_id: EVENT_ID,
      proposal_id: WINNER_ID,
      calendar_data: expect.objectContaining({
        title: BASE_EVENT.title,
        location: PROPOSALS[0]!.restaurant_addr,
        attendees: [{ name: 'Alice', email: 'alice@example.com' }],
      }),
    }));
  });

  it('sends winner-announced emails to accepted invitees only', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    const singleMock = vi.fn()
      .mockResolvedValueOnce({ data: BASE_EVENT })
      .mockResolvedValueOnce({ data: { id: EVENT_ID } });
    const dbWithSpy = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: insertSpy,
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
      }),
    };
    vi.mocked(createServiceClient).mockReturnValue(dbWithSpy as unknown as ReturnType<typeof createServiceClient>);

    await maybeAutoFinalize(EVENT_ID);

    expect(sendBatch).toHaveBeenCalled();
    const callArgs = vi.mocked(sendBatch).mock.calls[0]!;
    const messages = callArgs[1];
    expect(messages.length).toBe(1);
    expect(messages[0]!.to.name).toBe('Alice');
    expect(messages[0]!.template).toBe('winner-announced');
  });

  it('skips sendBatch when getNotificationService returns null', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    const singleMock = vi.fn()
      .mockResolvedValueOnce({ data: BASE_EVENT })
      .mockResolvedValueOnce({ data: { id: EVENT_ID } });
    const dbWithSpy = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: insertSpy,
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
      }),
    };
    vi.mocked(createServiceClient).mockReturnValue(dbWithSpy as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(getNotificationService).mockReturnValueOnce(null);

    await maybeAutoFinalize(EVENT_ID);

    expect(vi.mocked(sendBatch)).not.toHaveBeenCalled();
  });

  it('selects the highest Borda score winner', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    const singleMock = vi.fn()
      .mockResolvedValueOnce({ data: BASE_EVENT })
      .mockResolvedValueOnce({ data: { id: EVENT_ID } });
    const dbWithSpy = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: insertSpy,
        eq: vi.fn().mockReturnThis(),
        single: singleMock,
      }),
    };
    vi.mocked(createServiceClient).mockReturnValue(dbWithSpy as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(getVotesByEvent).mockResolvedValueOnce({ data: VOTES } as Awaited<ReturnType<typeof getVotesByEvent>>);

    await maybeAutoFinalize(EVENT_ID);

    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ proposal_id: 'proposal-1' }));
  });
});
