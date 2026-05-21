import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from './vibe-embedder';
import { PipelineError, RestaurantScore, StructuredConstraint } from '../pipeline/types';

vi.mock('../utils/cache', () => ({
  getCachedRestaurant: vi.fn().mockResolvedValue(null),
  setCachedRestaurant: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../utils/logger', () => ({
  safeLogStage: vi.fn(),
}));

import * as cacheModule from '../utils/cache';
import * as loggerModule from '../utils/logger';

function makeScore(overrides: Partial<RestaurantScore> = {}): RestaurantScore {
  return {
    place_id: 'p1',
    name: 'Test',
    review_summary: 'Great Italian restaurant with vegetarian options',
    vibeMatchScore: 0,
    composite: 0.7,
    confidence: 0.8,
    dietary_score: 0.7,
    budget_score: 0.75,
    cuisine_score: 0.6,
    location_score: 0.5,
    review_score: 0.84,
    disqualified: false,
    enrichedDescription: '',
    dietaryAnalysis: {},
    priceLevel: 3000,
    penalties: [],
    bonuses: [],
    constraintMatchSummary: '',
    ...overrides,
  };
}

function makeConstraint(overrides: Partial<StructuredConstraint> = {}): StructuredConstraint {
  return {
    guest_id: 'g1',
    invitation_id: 'inv1',
    event_id: 'evt1',
    dietary_hard: [],
    dietary_soft: [],
    cuisine_likes: { italian: 0.9 },
    cuisine_avoids: [],
    budget_min: 0,
    budget_max: 5000,
    vibe_tags: ['cozy', 'romantic'],
    dealbreaker_flags: [],
    intensity_tier: 'soft',
    weight_multiplier: 1.0,
    raw_text: '',
    ...overrides,
  };
}

const FAKE_EMBEDDING = [0.1, 0.2, 0.3, 0.4];
const FAKE_QUERY_EMBEDDING = [0.1, 0.2, 0.3, 0.4];

function makeFetchMock(docEmbedding = FAKE_EMBEDDING, queryEmbedding = FAKE_QUERY_EMBEDDING) {
  return vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
    const body = JSON.parse(opts.body as string) as { input_type: string; input: string[] };
    const isQuery = body.input_type === 'query';
    const embeddings = isQuery
      ? [{ embedding: queryEmbedding, index: 0 }]
      : (body.input as string[]).map((_item, i) => ({ embedding: docEmbedding, index: i }));
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: embeddings, usage: { total_tokens: 50 } }),
    });
  });
}

describe('vibe-embedder', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    savedEnv['VOYAGE_API_KEY'] = process.env['VOYAGE_API_KEY'];
    savedEnv['VOYAGE_MODEL'] = process.env['VOYAGE_MODEL'];
    process.env['VOYAGE_API_KEY'] = 'test-key';
    process.env['VOYAGE_MODEL'] = 'voyage-3';
  });

  afterEach(() => {
    process.env['VOYAGE_API_KEY'] = savedEnv['VOYAGE_API_KEY'];
    process.env['VOYAGE_MODEL'] = savedEnv['VOYAGE_MODEL'];
    vi.unstubAllGlobals();
  });

  it('throws PipelineError when VOYAGE_API_KEY is missing', async () => {
    delete process.env['VOYAGE_API_KEY'];
    await expect(run([makeScore()], [makeConstraint()])).rejects.toThrow(PipelineError);
  });

  it('throws PipelineError when VOYAGE_MODEL is missing', async () => {
    delete process.env['VOYAGE_MODEL'];
    await expect(run([makeScore()], [makeConstraint()])).rejects.toThrow(PipelineError);
  });

  it('happy path: calls API twice (documents + query) and sets vibeMatchScore between 0 and 1', async () => {
    const mockFetch = makeFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    const results = await run([makeScore()], [makeConstraint()]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(results[0]!.vibeMatchScore).toBeGreaterThanOrEqual(0);
    expect(results[0]!.vibeMatchScore).toBeLessThanOrEqual(1);
  });

  it('candidate with empty review_summary gets vibeMatchScore 0.3 with no API call', async () => {
    const mockFetch = makeFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    const results = await run([makeScore({ review_summary: '' })], [makeConstraint()]);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(results[0]!.vibeMatchScore).toBe(0.3);
  });

  it('cache hit on vibe_embedding uses cached embedding without calling API for that candidate', async () => {
    vi.mocked(cacheModule.getCachedRestaurant).mockResolvedValue({
      id: 'row1',
      place_id: 'p1',
      name: 'Test',
      dietary_analysis: null,
      vibe_embedding: FAKE_EMBEDDING,
      review_summary: null,
      menu_analysis: null,
      last_analyzed: new Date().toISOString(),
      ttl_days: 30,
    });

    const mockFetch = makeFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    const results = await run([makeScore()], [makeConstraint()]);

    // Only query call — no doc call since we have a cache hit
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(results[0]!.vibeMatchScore).toBeGreaterThanOrEqual(0);
    expect(results[0]!.vibeMatchScore).toBeLessThanOrEqual(1);
  });

  it('cache miss calls API and writes embedding to cache', async () => {
    vi.mocked(cacheModule.getCachedRestaurant).mockResolvedValue(null);
    const mockFetch = makeFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    await run([makeScore()], [makeConstraint()]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(cacheModule.setCachedRestaurant).toHaveBeenCalledWith('p1', { vibe_embedding: FAKE_EMBEDDING });
  });

  it('cache write failure does not throw and result is still returned', async () => {
    vi.mocked(cacheModule.getCachedRestaurant).mockResolvedValue(null);
    vi.mocked(cacheModule.setCachedRestaurant).mockRejectedValue(new Error('DB down'));
    vi.stubGlobal('fetch', makeFetchMock());

    const results = await run([makeScore()], [makeConstraint()]);

    expect(results).toHaveLength(1);
    expect(results[0]!.vibeMatchScore).toBeGreaterThanOrEqual(0);
  });

  it('safeLogStage is called exactly once on success', async () => {
    vi.stubGlobal('fetch', makeFetchMock());

    await run([makeScore()], [makeConstraint()]);

    expect(loggerModule.safeLogStage).toHaveBeenCalledTimes(1);
  });

  it('mixed: one candidate with review_summary, one without — only one doc API call made', async () => {
    const mockFetch = makeFetchMock();
    vi.stubGlobal('fetch', mockFetch);

    const candidates = [
      makeScore({ place_id: 'p1', review_summary: 'Great food' }),
      makeScore({ place_id: 'p2', review_summary: '' }),
    ];

    const results = await run(candidates, [makeConstraint()]);

    expect(results[1]!.vibeMatchScore).toBe(0.3);
    expect(results[0]!.vibeMatchScore).toBeGreaterThanOrEqual(0);
    // 1 doc call + 1 query call = 2 total
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
