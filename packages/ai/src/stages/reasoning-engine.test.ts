import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { run } from './reasoning-engine';
import { PipelineError, type ImplicitInferenceResult, type RestaurantScore, type StructuredConstraint } from '../pipeline/types';
import { safeLogStage } from '../utils/logger';
import { withRetry } from '../utils/retry';

vi.mock('@anthropic-ai/sdk', () => ({ default: vi.fn() }));
vi.mock('../utils/logger', () => ({ safeLogStage: vi.fn() }));
vi.mock('../utils/retry', () => ({
  withRetry: vi.fn(async (fn: () => Promise<unknown>) => {
    try {
      return await fn();
    } catch (err) {
      if ((err as { status?: number }).status === 429) return fn();
      throw err;
    }
  }),
}));

let mockCreate: ReturnType<typeof vi.fn>;

const constraint: StructuredConstraint = {
  guest_id: 'inv1',
  invitation_id: 'inv1',
  event_id: 'evt1',
  dietary_hard: ['vegetarian'],
  dietary_soft: [],
  cuisine_likes: {},
  cuisine_avoids: [],
  budget_min: 0,
  budget_max: 999999,
  vibe_tags: [],
  dealbreaker_flags: [],
  intensity_tier: 'hard',
  weight_multiplier: 1,
  raw_text: 'Vegetarian',
};

const candidate: RestaurantScore = {
  place_id: 'place1',
  name: 'Green Table',
  review_summary: 'Reviews suggest vegetarian options.',
  dietary_score: 1,
  budget_score: 1,
  cuisine_score: 1,
  location_score: 0.5,
  review_score: 0.9,
  composite: 0.9,
  vibeMatchScore: 0.8,
  disqualified: false,
  enrichedDescription: 'Green Table vegetarian $$',
  dietaryAnalysis: { vegetarian: 1 },
  priceLevel: 3000,
  confidence: 0.9,
  penalties: [],
  bonuses: [],
  constraintMatchSummary: 'good',
  envy_scores: { inv1: 0.2 },
  fairness_warnings: [],
};

const implicit: ImplicitInferenceResult = {
  context: { event_type_hint: 'work', meal_type: 'dinner', formality_bias: 0.5, group_size_class: 'small' },
  inferred: [],
};

function makeToolResponse(proposals: unknown[]) {
  return {
    content: [{ type: 'tool_use', id: 'tu1', name: 'submit_proposals', input: { proposals } }],
    usage: { input_tokens: 12, output_tokens: 8 },
  };
}

beforeEach(() => {
  mockCreate = vi.fn();
  (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({ messages: { create: mockCreate } }));
  process.env.ANTHROPIC_MODEL_REASONING = 'claude-sonnet-test';
});

afterEach(() => {
  delete process.env.ANTHROPIC_MODEL_REASONING;
  delete process.env.ANTHROPIC_EXTENDED_THINKING;
  vi.clearAllMocks();
});

describe('reasoning-engine', () => {
  it('throws PipelineError when ANTHROPIC_MODEL_REASONING is missing', async () => {
    delete process.env.ANTHROPIC_MODEL_REASONING;

    await expect(run([candidate], [constraint], implicit)).rejects.toBeInstanceOf(PipelineError);
  });

  it('returns ProposalWithNarrative objects with empty narratives', async () => {
    mockCreate.mockResolvedValueOnce(makeToolResponse([
      { place_id: 'place1', rank: 1, reasoning: 'Best fit.', constraints_met: ['vegetarian'], constraints_gap: [], fairness_note: 'Fair.' },
    ]));

    const result = await run([candidate], [constraint], implicit);

    expect(result).toEqual([
      expect.objectContaining({
        place_id: 'place1',
        rank: 1,
        narrative_group: '',
        narrative_personal: {},
        confidence_score: 0.9,
      }),
    ]);
  });

  it('throws PipelineError when tool_use is missing', async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'nope' }], usage: { input_tokens: 1, output_tokens: 1 } });

    await expect(run([candidate], [constraint], implicit)).rejects.toBeInstanceOf(PipelineError);
  });

  it('retries on 429 through withRetry', async () => {
    mockCreate
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
      .mockResolvedValueOnce(makeToolResponse([
        { place_id: 'place1', rank: 1, reasoning: 'Best fit.', constraints_met: [], constraints_gap: [], fairness_note: '' },
      ]));

    await run([candidate], [constraint], implicit);

    expect(withRetry).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('populates envy_scores from the selected candidate', async () => {
    mockCreate.mockResolvedValueOnce(makeToolResponse([
      { place_id: 'place1', rank: 1, reasoning: 'Best fit.', constraints_met: [], constraints_gap: [], fairness_note: '' },
    ]));

    const result = await run([candidate], [constraint], implicit);

    expect(result[0]!.envy_scores).toEqual({ inv1: 0.2 });
  });

  it('calls safeLogStage once', async () => {
    mockCreate.mockResolvedValueOnce(makeToolResponse([
      { place_id: 'place1', rank: 1, reasoning: 'Best fit.', constraints_met: [], constraints_gap: [], fairness_note: '' },
    ]));

    await run([candidate], [constraint], implicit);

    expect(safeLogStage).toHaveBeenCalledOnce();
    expect(safeLogStage).toHaveBeenCalledWith(expect.objectContaining({ stage: 'reasoning-engine' }));
  });

  it('does NOT include thinking or betas when ANTHROPIC_EXTENDED_THINKING is not set', async () => {
    delete process.env.ANTHROPIC_EXTENDED_THINKING;
    mockCreate.mockResolvedValueOnce(makeToolResponse([
      { place_id: 'place1', rank: 1, reasoning: 'Best fit.', constraints_met: [], constraints_gap: [], fairness_note: '' },
    ]));

    await run([candidate], [constraint], implicit);

    const callArgs = mockCreate.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs).not.toHaveProperty('thinking');
  });

  it('DOES include thinking when ANTHROPIC_EXTENDED_THINKING=true', async () => {
    process.env.ANTHROPIC_EXTENDED_THINKING = 'true';
    mockCreate.mockResolvedValueOnce(makeToolResponse([
      { place_id: 'place1', rank: 1, reasoning: 'Best fit.', constraints_met: [], constraints_gap: [], fairness_note: '' },
    ]));

    await run([candidate], [constraint], implicit);

    const callArgs = mockCreate.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs).toHaveProperty('thinking');

    delete process.env.ANTHROPIC_EXTENDED_THINKING;
  });
});
