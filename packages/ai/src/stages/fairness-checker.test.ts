import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from './fairness-checker';
import { RestaurantScore, StructuredConstraint } from '../pipeline/types';

vi.mock('../utils/logger', () => ({
  safeLogStage: vi.fn(),
}));

import * as loggerModule from '../utils/logger';

function makeScore(overrides: Partial<RestaurantScore> = {}): RestaurantScore {
  return {
    place_id: 'p1',
    name: 'Test Restaurant',
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

function makeConstraint(overrides: Partial<StructuredConstraint> = {}): StructuredConstraint {
  return {
    guest_id: 'real-guest-uuid-123',
    invitation_id: 'inv1',
    event_id: 'evt1',
    dietary_hard: [],
    dietary_soft: [],
    cuisine_likes: {},
    cuisine_avoids: [],
    budget_min: 0,
    budget_max: 5000,
    vibe_tags: [],
    dealbreaker_flags: [],
    intensity_tier: 'soft',
    weight_multiplier: 1.0,
    raw_text: '',
    ...overrides,
  };
}

describe('fairness-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('priceLevel === 0 (unknown) generates no budget envy and no budget warning', () => {
    const candidate = makeScore({ priceLevel: 0, dietary_score: 1.0, vibeMatchScore: 0.9 });
    const guest = makeConstraint({ budget_max: 1000, intensity_tier: 'soft' });

    const result = run([candidate], [guest]);

    const envyScore = result[0]!.envy_scores!['real-guest-uuid-123']!;
    // Only vibe envy: (1 - 0.9) * 0.3 = 0.03
    expect(envyScore).toBeCloseTo(0.03, 5);
    expect(result[0]!.fairness_warnings).toHaveLength(0);
  });

  it('budget_max === 999999 (unconstrained) generates no budget envy', () => {
    const candidate = makeScore({ priceLevel: 8000, dietary_score: 1.0, vibeMatchScore: 0.9 });
    const guest = makeConstraint({ budget_max: 999999, intensity_tier: 'soft' });

    const result = run([candidate], [guest]);

    const envyScore = result[0]!.envy_scores!['real-guest-uuid-123']!;
    expect(envyScore).toBeCloseTo(0.03, 5);
  });

  it('hard-constraint guest with dietary_score < 1.0 generates envy > 0', () => {
    const candidate = makeScore({ dietary_score: 0.5, priceLevel: 0, vibeMatchScore: 1.0 });
    const guest = makeConstraint({ intensity_tier: 'hard' });

    const result = run([candidate], [guest]);

    expect(result[0]!.envy_scores!['real-guest-uuid-123']!).toBeGreaterThan(0);
  });

  it('guest envy > 0.7 results in a warning in fairness_warnings', () => {
    // Hard constraint + dietary_score < 1.0 → envy starts at 1.0 → exceeds threshold
    const candidate = makeScore({ dietary_score: 0.5, priceLevel: 0, vibeMatchScore: 1.0 });
    const guest = makeConstraint({ intensity_tier: 'hard' });

    const result = run([candidate], [guest]);

    expect(result[0]!.fairness_warnings!.length).toBeGreaterThan(0);
  });

  it('guest envy <= 0.7 results in no warning', () => {
    // dietary_score === 1.0 (not hard anyway), price in budget, vibe perfect → envy = 0
    const candidate = makeScore({ dietary_score: 1.0, priceLevel: 3000, vibeMatchScore: 1.0 });
    const guest = makeConstraint({ budget_max: 5000, intensity_tier: 'soft' });

    const result = run([candidate], [guest]);

    expect(result[0]!.fairness_warnings).toHaveLength(0);
  });

  it('warning strings use guest_0, guest_1 indexes, not real guest IDs', () => {
    const candidate = makeScore({ dietary_score: 0.5, priceLevel: 0, vibeMatchScore: 1.0 });
    const guest0 = makeConstraint({ guest_id: 'real-uuid-alice', intensity_tier: 'hard' });
    const guest1 = makeConstraint({ guest_id: 'real-uuid-bob', intensity_tier: 'hard' });

    const result = run([candidate], [guest0, guest1]);

    const warnings = result[0]!.fairness_warnings!;
    expect(warnings.every(w => !w.includes('real-uuid-alice'))).toBe(true);
    expect(warnings.every(w => !w.includes('real-uuid-bob'))).toBe(true);
    expect(warnings.some(w => w.includes('guest_0'))).toBe(true);
    expect(warnings.some(w => w.includes('guest_1'))).toBe(true);
  });

  it('safeLogStage failure does not fail stage execution', () => {
    vi.mocked(loggerModule.safeLogStage).mockImplementation(() => {
      throw new Error('logger down');
    });

    const candidate = makeScore();
    const guest = makeConstraint();

    expect(() => run([candidate], [guest])).not.toThrow();
  });
});
