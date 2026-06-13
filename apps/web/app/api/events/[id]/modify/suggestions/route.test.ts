import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  getModificationSuggestionsByEvent: vi.fn(),
}));

import { GET } from './route';
import { getModificationSuggestionsByEvent } from '@/lib/db';

const context = { params: Promise.resolve({ id: 'evt-1' }) };

describe('GET /api/events/[id]/modify/suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty suggestions array when none exist', async () => {
    vi.mocked(getModificationSuggestionsByEvent).mockReturnValue({ data: [], error: null });

    const req = new NextRequest('http://localhost/api/events/evt-1/modify/suggestions');
    const res = await GET(req, context);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.suggestions).toEqual([]);
  });

  it('filters by status when query param provided', async () => {
    vi.mocked(getModificationSuggestionsByEvent).mockReturnValue({
      data: [{ id: 'sug-1', event_id: 'evt-1', status: 'pending', feedback_text: '太贵了' }],
      error: null,
    });

    const req = new NextRequest('http://localhost/api/events/evt-1/modify/suggestions?status=pending');
    const res = await GET(req, context);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.suggestions).toHaveLength(1);
    expect(json.suggestions[0].status).toBe('pending');
  });

  it('returns all suggestions when no status filter', async () => {
    vi.mocked(getModificationSuggestionsByEvent).mockReturnValue({
      data: [
        { id: 'sug-1', event_id: 'evt-1', status: 'pending', feedback_text: '太贵了' },
        { id: 'sug-2', event_id: 'evt-1', status: 'applied', feedback_text: '换日料' },
      ],
      error: null,
    });

    const req = new NextRequest('http://localhost/api/events/evt-1/modify/suggestions');
    const res = await GET(req, context);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.suggestions).toHaveLength(2);
  });
});
