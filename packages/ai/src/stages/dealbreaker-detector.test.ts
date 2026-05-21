import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { runDealbreakerDetector, DealbreakerInput, DealbreakerOutput } from './dealbreaker-detector';
import { PipelineError, ConstraintItem } from '../pipeline/types';

vi.mock('@anthropic-ai/sdk', () => ({ default: vi.fn() }));
vi.mock('../utils/logger', () => ({ safeLogStage: vi.fn() }));

let mockCreate: ReturnType<typeof vi.fn>;

function makeToolResponse(constraints: ConstraintItem[]) {
  return {
    content: [{ type: 'tool_use', id: 'tu_1', name: 'classify_constraints', input: { constraints } }],
    usage: { input_tokens: 10, output_tokens: 5 },
  };
}

describe('runDealbreakerDetector', () => {
  beforeEach(() => {
    mockCreate = vi.fn();
    (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      messages: { create: mockCreate },
    }));
    process.env.ANTHROPIC_MODEL_FAST = 'claude-haiku-test';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_MODEL_FAST;
    vi.useRealTimers();
  });

  it('classifies nut allergy as hard allergy', async () => {
    const input: DealbreakerInput[] = [{ guest_id: 'g1', raw_text: "I'm allergic to nuts" }];
    mockCreate.mockResolvedValueOnce(
      makeToolResponse([{ id: 'guest_0_c1', category: 'allergy', strength: 'hard', value: 'nuts', confidence: 0.95 }])
    );

    const result: DealbreakerOutput[] = await runDealbreakerDetector(input);

    expect(result[0]!.items).toContainEqual(expect.objectContaining({ strength: 'hard', category: 'allergy' }));
    expect(result[0]!.items[0]!.id.startsWith('guest_0_')).toBe(true);
  });

  it('classifies no meat as hard dietary', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse([{ id: 'guest_0_c1', category: 'dietary', strength: 'hard', value: 'no meat', confidence: 0.9 }])
    );

    const result = await runDealbreakerDetector([{ guest_id: 'g1', raw_text: "I don't eat meat" }]);

    expect(result[0]!.items[0]!.strength).toBe('hard');
    expect(result[0]!.items[0]!.category).toBe('dietary');
  });

  it('classifies prefer no spicy as soft dietary', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse([{ id: 'guest_0_c1', category: 'dietary', strength: 'soft', value: 'no spicy', confidence: 0.7 }])
    );

    const result = await runDealbreakerDetector([{ guest_id: 'g1', raw_text: "I'd prefer no spicy food" }]);

    expect(result[0]!.items[0]!.strength).toBe('soft');
    expect(result[0]!.items[0]!.category).toBe('dietary');
  });

  it('classifies somewhere casual as inferred ambiance', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse([{ id: 'guest_0_c1', category: 'ambiance', strength: 'inferred', value: 'casual', confidence: 0.6 }])
    );

    const result = await runDealbreakerDetector([{ guest_id: 'g1', raw_text: 'somewhere casual' }]);

    expect(result[0]!.items[0]!.strength).toBe('inferred');
    expect(result[0]!.items[0]!.category).toBe('ambiance');
  });

  it('classifies max 0 per person as hard budget', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse([{ id: 'guest_0_c1', category: 'budget', strength: 'hard', value: '40', confidence: 0.95 }])
    );

    const result = await runDealbreakerDetector([{ guest_id: 'g1', raw_text: 'max 0 per person' }]);

    expect(result[0]!.items[0]!.strength).toBe('hard');
    expect(result[0]!.items[0]!.category).toBe('budget');
  });

  it('returns empty items for empty raw_text', async () => {
    mockCreate.mockResolvedValueOnce(makeToolResponse([]));

    const result = await runDealbreakerDetector([{ guest_id: 'g1', raw_text: '' }]);

    expect(result[0]!.items.length).toBe(0);
    expect(result[0]!.guest_id).toBe('g1');
  });

  it('handles two guests and returns correct output array', async () => {
    mockCreate.mockResolvedValueOnce(
      makeToolResponse([
        { id: 'guest_0_c1', category: 'allergy', strength: 'hard', value: 'nuts', confidence: 0.95 },
        { id: 'guest_1_c1', category: 'dietary', strength: 'hard', value: 'vegetarian', confidence: 0.9 },
      ])
    );

    const result = await runDealbreakerDetector([
      { guest_id: 'g1', raw_text: 'No nuts' },
      { guest_id: 'g2', raw_text: 'Vegetarian' },
    ]);

    expect(result.length).toBe(2);
    expect(result[0]!.guest_id).toBe('g1');
    expect(result[1]!.guest_id).toBe('g2');
    expect(result[0]!.items.every(item => item.id.startsWith('guest_0_'))).toBe(true);
    expect(result[1]!.items.every(item => item.id.startsWith('guest_1_'))).toBe(true);
  });

  it('429 retry: retries twice then succeeds', async () => {
    vi.useFakeTimers();
    mockCreate
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce(
        makeToolResponse([{ id: 'guest_0_c1', category: 'dietary', strength: 'hard', value: 'test', confidence: 0.9 }])
      );

    const promise = runDealbreakerDetector([{ guest_id: 'g1', raw_text: 'test' }]);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('non-429 error throws PipelineError immediately', async () => {
    mockCreate.mockRejectedValueOnce({ status: 500 });

    await expect(runDealbreakerDetector([{ guest_id: 'g1', raw_text: 'test' }])).rejects.toBeInstanceOf(PipelineError);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('missing tool_use block throws PipelineError', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'oops' }],
      usage: { input_tokens: 5, output_tokens: 2 },
    });

    await expect(runDealbreakerDetector([{ guest_id: 'g1', raw_text: 'test' }])).rejects.toBeInstanceOf(PipelineError);
  });
});
