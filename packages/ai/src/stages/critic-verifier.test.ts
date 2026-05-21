import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { run } from './critic-verifier';
import { PipelineError, type ProposalWithNarrative, type RestaurantScore, type StructuredConstraint } from '../pipeline/types';
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

const constraint = { guest_id: 'inv1', invitation_id: 'inv1', event_id: 'evt1', dietary_hard: [], dietary_soft: [], cuisine_likes: {}, cuisine_avoids: [], budget_min: 0, budget_max: 999999, vibe_tags: [], dealbreaker_flags: [], intensity_tier: 'soft', weight_multiplier: 1, raw_text: '' } satisfies StructuredConstraint;
const proposal = { place_id: 'place1', rank: 1, reasoning: 'Good.', constraints_met: [], constraints_gap: [], fairness_note: '', envy_scores: {}, constraint_coverage: {}, narrative_group: '', narrative_personal: {}, confidence_score: 0.9 } satisfies ProposalWithNarrative;
const secondProposal = { ...proposal, place_id: 'place2', rank: 2 as const };
const candidate = { place_id: 'place1', name: 'A', review_summary: '', dietary_score: 1, budget_score: 1, cuisine_score: 1, location_score: 1, review_score: 1, composite: 1, vibeMatchScore: 1, disqualified: false, enrichedDescription: '', dietaryAnalysis: {}, priceLevel: 0, confidence: 1, penalties: [], bonuses: [], constraintMatchSummary: '' } satisfies RestaurantScore;

function makeVerifyResponse(results: unknown[]) {
  return { content: [{ type: 'tool_use', id: 'tu1', name: 'verify_proposals', input: { results } }], usage: { input_tokens: 5, output_tokens: 4 } };
}

beforeEach(() => {
  mockCreate = vi.fn();
  (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({ messages: { create: mockCreate } }));
  process.env.ANTHROPIC_MODEL_FAST = 'claude-haiku-test';
});

afterEach(() => {
  delete process.env.ANTHROPIC_MODEL_FAST;
  vi.clearAllMocks();
});

describe('critic-verifier', () => {
  it('returns all proposals when all pass', async () => {
    mockCreate.mockResolvedValueOnce(makeVerifyResponse([{ place_id: 'place1', pass: true, issues: [] }]));

    const result = await run([proposal], [constraint], [candidate]);

    expect(result).toEqual([proposal]);
  });

  it('returns only passing proposals when one fails', async () => {
    mockCreate.mockResolvedValueOnce(makeVerifyResponse([
      { place_id: 'place1', pass: false, issues: ['hard failure'] },
      { place_id: 'place2', pass: true, issues: [] },
    ]));

    const result = await run([proposal, secondProposal], [constraint], [candidate]);

    expect(result).toEqual([{ ...secondProposal, rank: 1 }]);
  });

  it('throws PipelineError when all proposals fail', async () => {
    mockCreate.mockResolvedValueOnce(makeVerifyResponse([{ place_id: 'place1', pass: false, issues: ['hard failure'] }]));

    await expect(run([proposal], [constraint], [candidate])).rejects.toBeInstanceOf(PipelineError);
  });

  it('throws PipelineError when ANTHROPIC_MODEL_FAST is missing', async () => {
    delete process.env.ANTHROPIC_MODEL_FAST;

    await expect(run([proposal], [constraint], [candidate])).rejects.toBeInstanceOf(PipelineError);
  });

  it('retries through withRetry', async () => {
    mockCreate
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
      .mockResolvedValueOnce(makeVerifyResponse([{ place_id: 'place1', pass: true, issues: [] }]));

    await run([proposal], [constraint], [candidate]);

    expect(withRetry).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
