import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedRestaurant, setCachedRestaurant } from './cache';

const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();

const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-id',
    place_id: 'place-1',
    name: 'Test Restaurant',
    dietary_analysis: { vegetarian: { source: 'inferred', confidence: 0.6 } },
    vibe_embedding: null,
    review_summary: 'Great food',
    menu_analysis: null,
    last_analyzed: new Date().toISOString(),
    ttl_days: 30,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('getCachedRestaurant', () => {
  it('returns the row when cache hit within TTL', async () => {
    const row = makeRow({ last_analyzed: new Date().toISOString(), ttl_days: 30 });
    mockMaybeSingle.mockResolvedValue({ data: row, error: null });

    const result = await getCachedRestaurant('place-1');

    expect(result).not.toBeNull();
    expect(result?.place_id).toBe('place-1');
  });

  it('returns null when no row exists (cache miss)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getCachedRestaurant('unknown-place');

    expect(result).toBeNull();
  });

  it('returns null when TTL is expired', async () => {
    const expiredDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const row = makeRow({ last_analyzed: expiredDate, ttl_days: 30 });
    mockMaybeSingle.mockResolvedValue({ data: row, error: null });

    const result = await getCachedRestaurant('place-1');

    expect(result).toBeNull();
  });

  it('throws when supabase returns an error', async () => {
    const supabaseError = new Error('DB connection failed');
    mockMaybeSingle.mockResolvedValue({ data: null, error: supabaseError });

    await expect(getCachedRestaurant('place-1')).rejects.toThrow('DB connection failed');
  });
});

describe('setCachedRestaurant', () => {
  it('calls upsert with correct fields including place_id and last_analyzed', async () => {
    mockUpsert.mockResolvedValue({ error: null });

    await setCachedRestaurant('place-1', { name: 'Test', dietary_analysis: { vegetarian: { source: 'inferred', confidence: 0.6 } } });

    expect(mockUpsert).toHaveBeenCalledOnce();
    const [data, options] = mockUpsert.mock.calls[0] as [Record<string, unknown>, { onConflict: string }];
    expect(data.place_id).toBe('place-1');
    expect(typeof data.last_analyzed).toBe('string');
    expect(data.name).toBe('Test');
    expect(options.onConflict).toBe('place_id');
  });
});
