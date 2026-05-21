import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { runConstraintExtractor, RawPreference } from './constraint-extractor';
import { PipelineError, ConstraintItem, ConstraintStrength, ImplicitInferenceResult } from '../pipeline/types';
import type { DealbreakerOutput } from './dealbreaker-detector';
import { safeLogStage } from '../utils/logger';

vi.mock('@anthropic-ai/sdk', () => ({ default: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
vi.mock('../utils/logger', () => ({ safeLogStage: vi.fn() }));

let mockCreate: ReturnType<typeof vi.fn>;
let mockUpsert: ReturnType<typeof vi.fn>;

function makeExtractToolResponse(constraints: unknown[]) {
  return {
    content: [{ type: 'tool_use', id: 'tu_1', name: 'extract_constraints', input: { constraints } }],
    usage: { input_tokens: 10, output_tokens: 5 },
  };
}

function makePrefs(): RawPreference[] {
  return [{ guest_id: 'g1', invitation_id: 'inv1', event_id: 'evt1', raw_text: 'No nuts please', weight_multiplier: 1.0 }];
}

function makeDealbreakers(strength: ConstraintStrength = 'hard'): DealbreakerOutput[] {
  return [{ guest_id: 'g1', items: [{ id: 'guest_0_c1', category: 'allergy', strength, value: 'nuts', confidence: 0.95 }] }];
}

function makeImplicit(): ImplicitInferenceResult {
  return {
    context: { event_type_hint: 'general', meal_type: 'dinner', formality_bias: 0, group_size_class: 'small' },
    inferred: [],
  };
}

function defaultExtractedConstraint() {
  return {
    guest_index: 0,
    dietary_hard: ['nuts'],
    dietary_soft: [],
    cuisine_likes: {},
    cuisine_avoids: [],
    budget_min: 0,
    budget_max: 999999,
    vibe_tags: [],
    dealbreaker_flags: ['allergy:nuts'],
  };
}

describe('runConstraintExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate = vi.fn();
    (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    mockUpsert = vi.fn().mockResolvedValue({ error: null });
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({ upsert: mockUpsert })),
    });

    process.env.ANTHROPIC_MODEL_FAST = 'claude-haiku-test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_MODEL_FAST;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.useRealTimers();
  });

  it('happy path: returns StructuredConstraint array of length 1', async () => {
    mockCreate.mockResolvedValueOnce(makeExtractToolResponse([defaultExtractedConstraint()]));

    const result = await runConstraintExtractor(makePrefs(), makeDealbreakers(), makeImplicit());

    expect(result.length).toBe(1);
    expect(result[0]!.guest_id).toBe('g1');
  });

  it('hard dealbreaker item -> intensity_tier hard', async () => {
    mockCreate.mockResolvedValueOnce(makeExtractToolResponse([defaultExtractedConstraint()]));

    const result = await runConstraintExtractor(makePrefs(), makeDealbreakers('hard'), makeImplicit());

    expect(result[0]!.intensity_tier).toBe('hard');
  });

  it('soft item confidence=0.8 -> intensity_tier strong', async () => {
    const dealbreakers = makeDealbreakers('soft');
    dealbreakers[0]!.items[0]!.confidence = 0.8;
    mockCreate.mockResolvedValueOnce(makeExtractToolResponse([defaultExtractedConstraint()]));

    const result = await runConstraintExtractor(makePrefs(), dealbreakers, makeImplicit());

    expect(result[0]!.intensity_tier).toBe('strong');
  });

  it('soft item confidence=0.6 -> intensity_tier soft', async () => {
    const dealbreakers = makeDealbreakers('soft');
    dealbreakers[0]!.items[0]!.confidence = 0.6;
    mockCreate.mockResolvedValueOnce(makeExtractToolResponse([defaultExtractedConstraint()]));

    const result = await runConstraintExtractor(makePrefs(), dealbreakers, makeImplicit());

    expect(result[0]!.intensity_tier).toBe('soft');
  });

  it('inferred strength -> intensity_tier inferred', async () => {
    mockCreate.mockResolvedValueOnce(makeExtractToolResponse([defaultExtractedConstraint()]));

    const result = await runConstraintExtractor(makePrefs(), [], makeImplicit());

    expect(result[0]!.intensity_tier).toBe('inferred');
  });

  it('supabase upsert error -> throws PipelineError', async () => {
    mockUpsert.mockResolvedValueOnce({ error: new Error('db error') });
    mockCreate.mockResolvedValueOnce(makeExtractToolResponse([defaultExtractedConstraint()]));

    await expect(runConstraintExtractor(makePrefs(), makeDealbreakers(), makeImplicit())).rejects.toBeInstanceOf(PipelineError);
  });

  it('429 retry: retries twice then succeeds', async () => {
    vi.useFakeTimers();
    mockCreate
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce(makeExtractToolResponse([defaultExtractedConstraint()]));

    const promise = runConstraintExtractor(makePrefs(), makeDealbreakers(), makeImplicit());
    await vi.runAllTimersAsync();
    await promise;

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('budget_max flows through as-is', async () => {
    mockCreate.mockResolvedValueOnce(makeExtractToolResponse([{ ...defaultExtractedConstraint(), budget_max: 4000 }]));

    const result = await runConstraintExtractor(makePrefs(), makeDealbreakers(), makeImplicit());

    expect(result[0]!.budget_max).toBe(4000);
  });

  it('items field stripped from DB upsert rows', async () => {
    mockCreate.mockResolvedValueOnce(makeExtractToolResponse([defaultExtractedConstraint()]));

    await runConstraintExtractor(makePrefs(), makeDealbreakers(), makeImplicit());
    const upsertArg = mockUpsert.mock.calls[0]![0] as unknown[];

    expect(upsertArg.every(row => !Object.prototype.hasOwnProperty.call(row, 'items'))).toBe(true);
  });

  it('safeLogStage called exactly once per successful run', async () => {
    mockCreate.mockResolvedValueOnce(makeExtractToolResponse([defaultExtractedConstraint()]));

    await runConstraintExtractor(makePrefs(), makeDealbreakers(), makeImplicit());

    expect((safeLogStage as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});
