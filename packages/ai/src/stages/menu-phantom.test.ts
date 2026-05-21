import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrich } from './menu-phantom';
import type { EnrichedCandidate, StructuredConstraint } from '../pipeline/types';

vi.mock('../utils/logger', () => ({
  safeLogStage: vi.fn(),
}));

vi.mock('../utils/cache', () => ({
  getCachedRestaurant: vi.fn(),
  setCachedRestaurant: vi.fn(),
}));

import { safeLogStage } from '../utils/logger';
import { getCachedRestaurant, setCachedRestaurant } from '../utils/cache';

function makeCandidate(overrides: Partial<EnrichedCandidate> = {}): EnrichedCandidate {
  return {
    place_id: 'place-1',
    name: 'Test Restaurant',
    address: '123 Main St',
    cuisine_types: ['italian'],
    price_range: '$$',
    rating: 4.2,
    review_count: 100,
    review_summary: '',
    dietary_analysis: {},
    enrichment_tier: 1,
    ...overrides,
  };
}

function makeConstraint(overrides: Partial<StructuredConstraint> = {}): StructuredConstraint {
  return {
    guest_id: 'guest-1',
    invitation_id: 'inv-1',
    event_id: 'event-1',
    dietary_hard: ['vegetarian'],
    dietary_soft: ['gluten_free'],
    cuisine_likes: {},
    cuisine_avoids: [],
    budget_min: 0,
    budget_max: 5000,
    vibe_tags: [],
    dealbreaker_flags: [],
    intensity_tier: 'hard',
    weight_multiplier: 1.0,
    raw_text: 'vegetarian please',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(setCachedRestaurant).mockResolvedValue(undefined);
});

describe('enrich (Menu Phantom Tier 1)', () => {
  it('cache hit with non-null dietary_analysis: returns cached data, skips keyword analysis', async () => {
    const cachedAnalysis = { vegetarian: { source: 'inferred' as const, confidence: 0.9, evidence: 'cached' } };
    vi.mocked(getCachedRestaurant).mockResolvedValue({
      id: 'row-id',
      place_id: 'place-1',
      name: 'Test',
      dietary_analysis: cachedAnalysis,
      vibe_embedding: null,
      review_summary: 'Does not contain vegetarian keyword',
      menu_analysis: null,
      last_analyzed: new Date().toISOString(),
      ttl_days: 30,
    });

    const candidate = makeCandidate({ review_summary: 'Does not contain vegetarian keyword' });
    const constraint = makeConstraint();

    const results = await enrich([candidate], [constraint]);
    const result = results[0]!;

    expect(result.dietary_analysis).toEqual(cachedAnalysis);
    expect(setCachedRestaurant).not.toHaveBeenCalled();
  });

  it('cache miss: runs Tier 1 keyword analysis', async () => {
    vi.mocked(getCachedRestaurant).mockResolvedValue(null);

    const candidate = makeCandidate({ review_summary: 'Great vegetarian options available.' });
    const constraint = makeConstraint();

    const results = await enrich([candidate], [constraint]);
    const result = results[0]!;

    expect(result.dietary_analysis).toBeDefined();
    expect(setCachedRestaurant).toHaveBeenCalledOnce();
  });

  it('Tier 1: review_summary mentioning vegetarian sets inferred confidence 0.6', async () => {
    vi.mocked(getCachedRestaurant).mockResolvedValue(null);

    const candidate = makeCandidate({ review_summary: 'Excellent vegetarian dishes available.' });
    const constraint = makeConstraint({ dietary_hard: ['vegetarian'], dietary_soft: [] });

    const results = await enrich([candidate], [constraint]);
    const result = results[0]!;

    expect(result.dietary_analysis.vegetarian).toMatchObject({
      source: 'inferred',
      confidence: 0.6,
    });
  });

  it('Tier 1: review_summary mentioning certified halal sets confidence 0.85', async () => {
    vi.mocked(getCachedRestaurant).mockResolvedValue(null);

    const candidate = makeCandidate({ review_summary: 'This place is certified halal and family-friendly.' });
    const constraint = makeConstraint({ dietary_hard: ['halal'], dietary_soft: [] });

    const results = await enrich([candidate], [constraint]);
    const result = results[0]!;

    expect(result.dietary_analysis.halal).toMatchObject({
      source: 'inferred',
      confidence: 0.85,
    });
  });

  it('empty review_summary: all constraint-matched categories get source: unknown', async () => {
    vi.mocked(getCachedRestaurant).mockResolvedValue(null);

    const candidate = makeCandidate({ review_summary: '' });
    const constraint = makeConstraint({ dietary_hard: ['vegetarian'], dietary_soft: [] });

    const results = await enrich([candidate], [constraint]);
    const result = results[0]!;

    expect(result.dietary_analysis.vegetarian).toMatchObject({
      source: 'unknown',
      confidence: 0,
    });
  });

  it('source grounded is never set by Tier 1 across multiple inputs', async () => {
    vi.mocked(getCachedRestaurant).mockResolvedValue(null);

    const candidates = [
      makeCandidate({ place_id: 'p1', review_summary: '100% vegan, certified halal, gluten-free kitchen.' }),
      makeCandidate({ place_id: 'p2', review_summary: 'Vegetarian options, dairy-free, nut-free available.' }),
      makeCandidate({ place_id: 'p3', review_summary: '' }),
    ];
    const constraint = makeConstraint({ dietary_hard: ['vegan', 'halal'], dietary_soft: ['gluten_free', 'dairy_free', 'vegetarian', 'nut_free'] });

    const results = await enrich(candidates, [constraint]);

    for (const result of results) {
      for (const signal of Object.values(result.dietary_analysis)) {
        expect(signal.source).not.toBe('grounded');
      }
    }
  });

  it('cache write failure does not throw; enriched result still returned', async () => {
    vi.mocked(getCachedRestaurant).mockResolvedValue(null);
    vi.mocked(setCachedRestaurant).mockRejectedValue(new Error('Cache unavailable'));

    const candidate = makeCandidate({ review_summary: 'Great vegetarian options.' });
    const constraint = makeConstraint();

    const results = await enrich([candidate], [constraint]);
    const result = results[0]!;

    expect(results).toHaveLength(1);
    expect(result.dietary_analysis.vegetarian).toBeDefined();
  });

  it('calls safeLogStage for batch log and cache hits', async () => {
    const cachedAnalysis = { vegetarian: { source: 'inferred' as const, confidence: 0.6 } };
    vi.mocked(getCachedRestaurant).mockResolvedValue({
      id: 'row-id',
      place_id: 'place-1',
      name: 'Test',
      dietary_analysis: cachedAnalysis,
      vibe_embedding: null,
      review_summary: null,
      menu_analysis: null,
      last_analyzed: new Date().toISOString(),
      ttl_days: 30,
    });

    const candidate = makeCandidate();
    const constraint = makeConstraint();

    await enrich([candidate], [constraint]);

    expect(safeLogStage).toHaveBeenCalledWith(expect.objectContaining({ stage: 'menu-phantom-cache-hit' }));
    expect(safeLogStage).toHaveBeenCalledWith(expect.objectContaining({ stage: 'menu-phantom' }));
  });
});
