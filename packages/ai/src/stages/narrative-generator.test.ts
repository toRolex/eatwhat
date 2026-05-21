import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { run } from './narrative-generator';
import { PipelineError, type ProposalWithNarrative, type StructuredConstraint } from '../pipeline/types';
import { safeLogStage } from '../utils/logger';

vi.mock('@anthropic-ai/sdk', () => ({ default: vi.fn() }));
vi.mock('../utils/logger', () => ({ safeLogStage: vi.fn() }));
vi.mock('../utils/retry', () => ({ withRetry: vi.fn((fn: () => Promise<unknown>) => fn()) }));

let mockCreate: ReturnType<typeof vi.fn>;

const constraints = [
  { guest_id: 'inv1', invitation_id: 'inv1', event_id: 'evt1', dietary_hard: ['vegetarian'], dietary_soft: [], cuisine_likes: {}, cuisine_avoids: [], budget_min: 0, budget_max: 999999, vibe_tags: [], dealbreaker_flags: [], intensity_tier: 'hard', weight_multiplier: 1, raw_text: 'Vegetarian' },
  { guest_id: 'inv2', invitation_id: 'inv2', event_id: 'evt1', dietary_hard: [], dietary_soft: [], cuisine_likes: {}, cuisine_avoids: [], budget_min: 0, budget_max: 3000, vibe_tags: [], dealbreaker_flags: [], intensity_tier: 'soft', weight_multiplier: 1, raw_text: 'Budget' },
] satisfies StructuredConstraint[];

const proposal = { place_id: 'place1', rank: 1, reasoning: 'Good.', constraints_met: ['vegetarian'], constraints_gap: [], fairness_note: '', envy_scores: {}, constraint_coverage: {}, narrative_group: '', narrative_personal: {}, confidence_score: 0.9 } satisfies ProposalWithNarrative;

function makeNarrativeResponse(narratives: unknown[]) {
  return { content: [{ type: 'tool_use', id: 'tu1', name: 'generate_narratives', input: { narratives } }], usage: { input_tokens: 6, output_tokens: 5 } };
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

describe('narrative-generator', () => {
  it('populates narrative_group and narrative_personal', async () => {
    mockCreate.mockResolvedValueOnce(makeNarrativeResponse([
      { place_id: 'place1', group: 'A strong group fit.', personal: { guest_0: 'Likely fits your needs.' } },
    ]));

    const result = await run([proposal], constraints);

    expect(result[0]).toMatchObject({
      narrative_group: 'A strong group fit.',
      narrative_personal: { inv1: 'Likely fits your needs.' },
    });
  });

  it('maps personal guest_0 keys back to real guest_ids', async () => {
    mockCreate.mockResolvedValueOnce(makeNarrativeResponse([
      { place_id: 'place1', group: 'Group.', personal: { guest_0: 'First.', guest_1: 'Second.' } },
    ]));

    const result = await run([proposal], constraints);

    expect(result[0]!.narrative_personal).toEqual({ inv1: 'First.', inv2: 'Second.' });
    expect(result[0]!.narrative_personal).not.toHaveProperty('guest_0');
  });

  it('throws PipelineError when ANTHROPIC_MODEL_FAST is missing', async () => {
    delete process.env.ANTHROPIC_MODEL_FAST;

    await expect(run([proposal], constraints)).rejects.toBeInstanceOf(PipelineError);
  });

  it('throws PipelineError when tool_use is missing', async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'nope' }], usage: { input_tokens: 1, output_tokens: 1 } });

    await expect(run([proposal], constraints)).rejects.toBeInstanceOf(PipelineError);
  });

  it('calls safeLogStage before returning', async () => {
    mockCreate.mockResolvedValueOnce(makeNarrativeResponse([
      { place_id: 'place1', group: 'Group.', personal: {} },
    ]));

    const result = await run([proposal], constraints);

    expect(safeLogStage).toHaveBeenCalledWith(expect.objectContaining({ stage: 'narrative-generator' }));
    expect(result[0]!.narrative_group).toBe('Group.');
  });
});
