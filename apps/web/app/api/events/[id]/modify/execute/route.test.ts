import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  getEventById: vi.fn(),
  getModificationSuggestionsByEvent: vi.fn(),
  updateModificationSuggestionStatus: vi.fn(),
  getProposalsByEvent: vi.fn(),
  bumpPlanVersion: vi.fn(),
  replaceProposalsAndAdvance: vi.fn(),
}));

import { POST } from './route';
import {
  getEventById,
  getModificationSuggestionsByEvent,
  updateModificationSuggestionStatus,
  getProposalsByEvent,
  bumpPlanVersion,
  replaceProposalsAndAdvance,
} from '@/lib/db';

const context = { params: Promise.resolve({ id: 'evt-1' }) };

const mockProposals = [
  { id: 'p1', event_id: 'evt-1', rank: 1, restaurant_name: '潮汕牛肉火锅', price_range: '$$$', version: 1 },
  { id: 'p2', event_id: 'evt-1', rank: 2, restaurant_name: '点都德', price_range: '$$', version: 1 },
  { id: 'p3', event_id: 'evt-1', rank: 3, restaurant_name: '太二酸菜鱼', price_range: '$$', version: 1 },
];

describe('POST /api/events/[id]/modify/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEventById).mockReturnValue({
      data: { id: 'evt-1', host_id: 'demo-host', status: 'deciding', plan_version: 1 },
      error: null,
    });
    vi.mocked(getModificationSuggestionsByEvent).mockReturnValue({
      data: [
        {
          id: 'sug-1', event_id: 'evt-1', invitation_id: 'inv-1',
          feedback_text: '预算太贵了', intent_type: 'budget', affected_scope: 'local',
          status: 'pending',
        },
        {
          id: 'sug-2', event_id: 'evt-1', invitation_id: 'inv-2',
          feedback_text: '换日料', intent_type: 'cuisine', affected_scope: 'local',
          status: 'pending',
        },
      ],
      error: null,
    });
    vi.mocked(getProposalsByEvent).mockReturnValue({
      data: mockProposals,
      error: null,
    });
    vi.mocked(updateModificationSuggestionStatus).mockReturnValue({
      data: undefined,
      error: null,
    });
    vi.mocked(bumpPlanVersion).mockReturnValue({ data: 2, error: null });
    vi.mocked(replaceProposalsAndAdvance).mockReturnValue({ error: null });
  });

  it('returns 422 when event is not in deciding state', async () => {
    vi.mocked(getEventById).mockReturnValue({
      data: { id: 'evt-1', host_id: 'demo-host', status: 'collecting' },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/events/evt-1/modify/execute', {
      method: 'POST',
      body: JSON.stringify({ approved_ids: ['sug-1'], rejected_ids: ['sug-2'] }),
    });

    const res = await POST(req, context);
    expect(res.status).toBe(422);
  });

  it('returns 400 when approved_ids and rejected_ids are both empty', async () => {
    const req = new NextRequest('http://localhost/api/events/evt-1/modify/execute', {
      method: 'POST',
      body: JSON.stringify({ approved_ids: [], rejected_ids: [] }),
    });

    const res = await POST(req, context);
    expect(res.status).toBe(400);
  });

  it('processes modification successfully with local scope', async () => {
    const req = new NextRequest('http://localhost/api/events/evt-1/modify/execute', {
      method: 'POST',
      body: JSON.stringify({ approved_ids: ['sug-1'], rejected_ids: ['sug-2'] }),
    });

    const res = await POST(req, context);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.new_version).toBe(2);
    expect(json.change_log).toBeDefined();
    expect(json.change_log.kept).toBeInstanceOf(Array);
    expect(json.change_log.reason).toBeDefined();
  });

  it('returns 404 when event not found', async () => {
    vi.mocked(getEventById).mockReturnValue({
      data: null,
      error: { message: 'Not found' },
    });

    const req = new NextRequest('http://localhost/api/events/evt-1/modify/execute', {
      method: 'POST',
      body: JSON.stringify({ approved_ids: ['sug-1'], rejected_ids: [] }),
    });

    const res = await POST(req, context);
    expect(res.status).toBe(404);
  });

  it('processes full scope when location intent is approved', async () => {
    vi.mocked(getModificationSuggestionsByEvent).mockReturnValue({
      data: [
        {
          id: 'sug-3', event_id: 'evt-1', invitation_id: 'inv-3',
          feedback_text: '去后海', intent_type: 'location', affected_scope: 'full',
          status: 'pending',
        },
      ],
      error: null,
    });

    const req = new NextRequest('http://localhost/api/events/evt-1/modify/execute', {
      method: 'POST',
      body: JSON.stringify({ approved_ids: ['sug-3'], rejected_ids: [] }),
    });

    const res = await POST(req, context);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.change_log.reason).toContain('全量重算');
  });
});
