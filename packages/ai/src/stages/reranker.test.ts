import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './reranker';
import { RestaurantScore, StructuredConstraint } from '../pipeline/types';

vi.mock('../utils/logger', () => ({
  safeLogStage: vi.fn(),
}));

function makeScore(overrides: Partial<RestaurantScore> = {}): RestaurantScore {
  return {
    place_id: 'p1',
    name: 'Test',
    review_summary: '',
    vibeMatchScore: 0.5,
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

const NO_CONSTRAINTS: StructuredConstraint[] = [];

describe('reranker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disqualified candidates are not in top-N output even with high composite score', async () => {
    const disq = makeScore({ place_id: 'disq', composite: 1.0, confidence: 1.0, vibeMatchScore: 1.0, disqualified: true });
    const good = makeScore({ place_id: 'good', composite: 0.5, confidence: 0.5, vibeMatchScore: 0.5, disqualified: false });

    const result = await run([disq, good], NO_CONSTRAINTS);

    expect(result.every(r => !r.disqualified)).toBe(true);
    expect(result.find(r => r.place_id === 'disq')).toBeUndefined();
  });

  it('returns candidates sorted by rerank score DESC', async () => {
    const a = makeScore({ place_id: 'a', composite: 0.9, confidence: 0.9, vibeMatchScore: 0.9 });
    const b = makeScore({ place_id: 'b', composite: 0.5, confidence: 0.5, vibeMatchScore: 0.5 });
    const c = makeScore({ place_id: 'c', composite: 0.7, confidence: 0.7, vibeMatchScore: 0.7 });

    const result = await run([b, c, a], NO_CONSTRAINTS);

    expect(result[0]!.place_id).toBe('a');
    expect(result[1]!.place_id).toBe('c');
    expect(result[2]!.place_id).toBe('b');
  });

  it('returns at most 5 candidates (TOP_N)', async () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeScore({ place_id: 'p' + i, composite: i * 0.1, confidence: 0.5, vibeMatchScore: 0.5 }),
    );

    const result = await run(candidates, NO_CONSTRAINTS);

    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('empty input returns empty array', async () => {
    const result = await run([], NO_CONSTRAINTS);
    expect(result).toEqual([]);
  });

  it('fewer than TOP_N non-disqualified candidates returns all non-disqualified', async () => {
    const candidates = [
      makeScore({ place_id: 'a', disqualified: false }),
      makeScore({ place_id: 'b', disqualified: false }),
      makeScore({ place_id: 'c', disqualified: true }),
    ];

    const result = await run(candidates, NO_CONSTRAINTS);

    expect(result).toHaveLength(2);
    expect(result.every(r => !r.disqualified)).toBe(true);
  });

  it('reranking is deterministic: same input twice yields identical output', async () => {
    const candidates = [
      makeScore({ place_id: 'a', composite: 0.8, confidence: 0.7, vibeMatchScore: 0.6 }),
      makeScore({ place_id: 'b', composite: 0.6, confidence: 0.9, vibeMatchScore: 0.8 }),
    ];

    const result1 = await run([...candidates], NO_CONSTRAINTS);
    const result2 = await run([...candidates], NO_CONSTRAINTS);

    expect(result1.map(r => r.place_id)).toEqual(result2.map(r => r.place_id));
  });
});

describe('reranker safeLogStage error resilience', () => {
  it('run still returns result when safeLogStage throws synchronously', async () => {
    const { safeLogStage } = await import('../utils/logger');
    vi.mocked(safeLogStage).mockImplementation(() => { throw new Error('log error'); });

    const candidates = [makeScore({ place_id: 'a' })];
    const result = await run(candidates, NO_CONSTRAINTS);

    expect(result).toHaveLength(1);
    expect(result[0]!.place_id).toBe('a');

    vi.mocked(safeLogStage).mockReset();
  });
});
