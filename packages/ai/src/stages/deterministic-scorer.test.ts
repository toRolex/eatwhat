import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnrichedCandidate, StructuredConstraint } from '../pipeline/types';
import { score } from './deterministic-scorer';
import { safeLogStage } from '../utils/logger';

vi.mock('../utils/logger', () => ({ safeLogStage: vi.fn() }));

function makeCandidate(overrides?: Partial<EnrichedCandidate>): EnrichedCandidate {
  return {
    place_id: 'p1',
    name: 'Test Restaurant',
    cuisine_types: ['Italian'],
    price_range: '$$',
    rating: 4.2,
    review_count: 120,
    review_summary: 'Great place',
    dietary_analysis: {},
    enrichment_tier: 1,
    address: '123 Main St',
    ...overrides,
  };
}

function makeConstraint(overrides?: Partial<StructuredConstraint>): StructuredConstraint {
  return {
    guest_id: 'g1',
    invitation_id: 'i1',
    event_id: 'e1',
    intensity_tier: 'soft',
    dietary_hard: [],
    dietary_soft: [],
    cuisine_likes: {},
    cuisine_avoids: [],
    budget_max: 999999,
    budget_min: 0,
    weight_multiplier: 1.0,
    vibe_tags: [],
    dealbreaker_flags: [],
    raw_text: 'test',
    ...overrides,
  };
}

describe('score', () => {
  afterEach(() => {
    vi.mocked(safeLogStage).mockReset();
  });

  it('hard cuisine avoidance match disqualifies with reason', () => {
    const result = score(
      [makeCandidate({ cuisine_types: ['Seafood'] })],
      [makeConstraint({ intensity_tier: 'hard', cuisine_avoids: ['seafood'] })]
    );

    expect(result[0]!.disqualified).toBe(true);
    expect(result[0]!.disqualify_reason).toBe('Hard cuisine avoidance: seafood matches Seafood');
  });

  it('soft cuisine avoidance does not disqualify and lowers cuisine score', () => {
    const result = score(
      [makeCandidate({ cuisine_types: ['Seafood'] })],
      [makeConstraint({ intensity_tier: 'soft', cuisine_avoids: ['seafood'] })]
    );

    expect(result[0]!.disqualified).toBe(false);
    expect(result[0]!.cuisine_score).toBeLessThan(0.5);
  });

  it('hard budget exceeded by more than 50 percent disqualifies', () => {
    const result = score(
      [makeCandidate({ price_range: '$$$$' })],
      [makeConstraint({ intensity_tier: 'hard', budget_max: 2000 })]
    );

    expect(result[0]!.disqualified).toBe(true);
    expect(result[0]!.disqualify_reason).toBe('Estimated price 8000c exceeds all hard-budget guests limits');
  });

  it('unknown dietary signal for hard constraint does not disqualify and reduces confidence', () => {
    const result = score(
      [makeCandidate({ dietary_analysis: { vegan: { source: 'unknown', confidence: 0 } } })],
      [makeConstraint({ dietary_hard: ['vegan'], intensity_tier: 'hard' })]
    );

    expect(result[0]!.disqualified).toBe(false);
    expect(result[0]!.confidence).toBeLessThan(1.0);
    expect(result[0]!.penalties).toContain('vegan: unknown for hard constraint');
  });

  it('inferred dietary signal scores between low and high inferred bounds without disqualification', () => {
    const result = score(
      [makeCandidate({ dietary_analysis: { vegan: { source: 'inferred', confidence: 0.6 } } })],
      [makeConstraint({ dietary_hard: ['vegan'] })]
    );

    expect(result[0]!.dietaryAnalysis.vegan).toBeGreaterThan(0.3);
    expect(result[0]!.dietaryAnalysis.vegan).toBeLessThan(0.7);
    expect(result[0]!.disqualified).toBe(false);
  });

  it('grounded high-confidence dietary signal scores 1.0', () => {
    const result = score(
      [makeCandidate({ dietary_analysis: { vegan: { source: 'grounded', confidence: 0.95 } } })],
      [makeConstraint({ dietary_hard: ['vegan'] })]
    );

    expect(result[0]!.dietaryAnalysis.vegan).toBe(1.0);
  });

  it('cuisine match bonus raises cuisine score', () => {
    const result = score(
      [makeCandidate({ cuisine_types: ['Italian'] })],
      [makeConstraint({ cuisine_likes: { italian: 0.9 } })]
    );

    expect(result[0]!.cuisine_score).toBeGreaterThan(0.5);
  });

  it('multiple candidates rank by composite score', () => {
    const better = makeCandidate({ place_id: 'better', cuisine_types: ['Italian'], rating: 4.5 });
    const worse = makeCandidate({ place_id: 'worse', cuisine_types: ['Thai'], rating: 3.0 });

    const result = score([worse, better], [makeConstraint({ cuisine_likes: { italian: 0.9 } })]);

    expect(result[0]!.place_id).toBe('better');
  });

  it('disqualified candidates sort after non-disqualified candidates', () => {
    const disqualified = makeCandidate({ place_id: 'bad', cuisine_types: ['Seafood'] });
    const allowed = makeCandidate({ place_id: 'good', cuisine_types: ['Italian'] });

    const result = score([disqualified, allowed], [makeConstraint({ intensity_tier: 'hard', cuisine_avoids: ['seafood'] })]);

    expect(result[result.length - 1]!.place_id).toBe('bad');
    expect(result[result.length - 1]!.disqualified).toBe(true);
  });

  it('is deterministic for the same input', () => {
    const candidates = [makeCandidate()];
    const constraints = [makeConstraint({ cuisine_likes: { italian: 0.9 }, dietary_soft: ['vegetarian'] })];

    expect(JSON.stringify(score(candidates, constraints))).toBe(JSON.stringify(score(candidates, constraints)));
  });

  it('calls safeLogStage exactly once per score call', () => {
    score([makeCandidate()], [makeConstraint()]);

    expect(safeLogStage).toHaveBeenCalledOnce();
  });

  it('empty constraints return candidates with no disqualification', () => {
    const result = score([makeCandidate()], []);

    expect(result.length).toBe(1);
    expect(result[0]!.disqualified).toBe(false);
  });

  it('empty candidates returns an empty array', () => {
    const result = score([], [makeConstraint()]);

    expect(result.length).toBe(0);
  });

  it('word-token guard: "bar" in cuisine_avoids does NOT disqualify "Barbecue" cuisine', () => {
    const result = score(
      [makeCandidate({ cuisine_types: ['Barbecue', 'American'] })],
      [makeConstraint({ intensity_tier: 'hard', cuisine_avoids: ['bar'] })],
    );
    expect(result[0]!.disqualified).toBe(false);
  });
});

describe('score with logging failures', () => {
  beforeEach(() => {
    vi.mocked(safeLogStage).mockImplementation(() => {
      throw new Error('log failed');
    });
  });

  afterEach(() => {
    vi.mocked(safeLogStage).mockReset();
  });

  it('does not propagate synchronous safeLogStage throws', () => {
    expect(() => score([makeCandidate()], [makeConstraint()])).not.toThrow();
    expect(score([makeCandidate()], [makeConstraint()]).length).toBe(1);
  });
});

describe('textMatches word-token matching', () => {
  it('bar does NOT match Barbecue cuisine type (false positive guard)', () => {
    const result = score(
      [makeCandidate({ cuisine_types: ['Barbecue'] })],
      [makeConstraint({ intensity_tier: 'hard', cuisine_avoids: ['bar'] })]
    );
    // 'bar' tokenizes to nothing (length < 3), so no match -> not disqualified
    expect(result[0]!.disqualified).toBe(false);
  });

  it('seafood DOES match Seafood cuisine type (true positive preserved)', () => {
    const result = score(
      [makeCandidate({ cuisine_types: ['Seafood'] })],
      [makeConstraint({ intensity_tier: 'hard', cuisine_avoids: ['seafood'] })]
    );
    expect(result[0]!.disqualified).toBe(true);
  });

  it('thai DOES match Thai Food cuisine type (multi-word preserved)', () => {
    const result = score(
      [makeCandidate({ cuisine_types: ['Thai Food'] })],
      [makeConstraint({ intensity_tier: 'hard', cuisine_avoids: ['thai'] })]
    );
    expect(result[0]!.disqualified).toBe(true);
  });
});

describe('safeRating and safeReviewCount guards', () => {
  it('safeRating: NaN rating does not crash score and produces valid enrichedDescription', () => {
    const result = score(
      [makeCandidate({ rating: NaN })],
      [makeConstraint()]
    );
    expect(result[0]!.enrichedDescription).toContain('Rating: 0.0/5');
    expect(result[0]!.review_score).toBe(0.5);
  });

  it('safeRating: negative rating treated as 0, safeReviewCount: negative review_count treated as 0', () => {
    const result = score(
      [makeCandidate({ rating: -1, review_count: -5 })],
      [makeConstraint()]
    );
    expect(result[0]!.review_score).toBe(0.5);
    expect(result[0]!.enrichedDescription).toContain('(0 reviews)');
  });

  it('safeRating: rating above 5 is clamped to 5', () => {
    const result = score(
      [makeCandidate({ rating: 6.0, review_count: 100 })],
      [makeConstraint()]
    );
    expect(result[0]!.review_score).toBe(1.0);
    expect(result[0]!.enrichedDescription).toContain('Rating: 5.0/5');
  });

  it('safeReviewCount: fractional review_count is floored', () => {
    const result = score(
      [makeCandidate({ rating: 4.0, review_count: 1.7 })],
      [makeConstraint()]
    );
    // review_count floored to 1 which is < MIN_REVIEW_COUNT (50), so penalty applies
    expect(result[0]!.confidence).toBeLessThan(1.0);
  });
});
