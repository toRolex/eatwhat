import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  getEventById: vi.fn(),
  insertModificationSuggestion: vi.fn(),
}));

import { POST } from './route';
import { getEventById, insertModificationSuggestion } from '@/lib/db';

const context = { params: Promise.resolve({ id: 'evt-1' }) };

describe('POST /api/events/[id]/modify/suggest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEventById).mockReturnValue({
      data: { id: 'evt-1', status: 'deciding' },
      error: null,
    });
    vi.mocked(insertModificationSuggestion).mockImplementation((input) => ({
      data: {
        id: 'sug-1',
        event_id: 'evt-1',
        invitation_id: 'inv-1',
        feedback_text: input.feedback_text,
        intent_type: 'budget',
        intent_confidence: 0.85,
        affected_scope: 'local',
        ai_interpretation: '',
        status: 'pending',
        created_at: '2026-06-13T00:00:00.000Z',
      },
      error: null,
    }));
  });

  it('returns 422 when event is not in deciding or finalized state', async () => {
    vi.mocked(getEventById).mockReturnValue({
      data: { id: 'evt-1', status: 'collecting' },
      error: null,
    });

    const req = new NextRequest('http://localhost/api/events/evt-1/modify/suggest', {
      method: 'POST',
      body: JSON.stringify({ feedback_text: '预算太贵了' }),
    });

    const res = await POST(req, context);
    expect(res.status).toBe(422);
  });

  it('returns 200 with suggestion on valid feedback_text', async () => {
    const req = new NextRequest('http://localhost/api/events/evt-1/modify/suggest', {
      method: 'POST',
      body: JSON.stringify({ feedback_text: '预算砍到80以下' }),
    });

    const res = await POST(req, context);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.suggestion).toBeDefined();
    expect(json.suggestion.feedback_text).toBe('预算砍到80以下');
    expect(json.suggestion.intent_type).toBe('budget');
    expect(json.suggestion.status).toBe('pending');
  });

  it('returns 400 when feedback_text is empty', async () => {
    const req = new NextRequest('http://localhost/api/events/evt-1/modify/suggest', {
      method: 'POST',
      body: JSON.stringify({ feedback_text: '' }),
    });

    const res = await POST(req, context);
    expect(res.status).toBe(400);
  });

  it('returns 400 when feedback_text is missing', async () => {
    const req = new NextRequest('http://localhost/api/events/evt-1/modify/suggest', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req, context);
    expect(res.status).toBe(400);
  });

  it('returns 404 when event not found', async () => {
    vi.mocked(getEventById).mockReturnValue({
      data: null,
      error: { message: 'Not found' },
    });

    const req = new NextRequest('http://localhost/api/events/evt-1/modify/suggest', {
      method: 'POST',
      body: JSON.stringify({ feedback_text: '太贵了' }),
    });

    const res = await POST(req, context);
    expect(res.status).toBe(404);
  });

  it('classifies budget intent correctly', async () => {
    const req = new NextRequest('http://localhost/api/events/evt-1/modify/suggest', {
      method: 'POST',
      body: JSON.stringify({ feedback_text: '太贵了，降预算到80' }),
    });

    const res = await POST(req, context);
    const json = await res.json();

    expect(json.suggestion.intent_type).toBe('budget');
    expect(json.suggestion.affected_scope).toBe('local');
  });
});
