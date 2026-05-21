import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geminiMapsGrounding } from './gemini';
import { PipelineError } from '../pipeline/types';
import type { StructuredConstraint } from '../pipeline/types';

vi.mock('../utils/logger', () => ({
  safeLogStage: vi.fn(),
}));

vi.mock('../utils/retry', () => ({
  withRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

import { safeLogStage } from '../utils/logger';
import { withRetry } from '../utils/retry';

const mockConstraint: StructuredConstraint = {
  guest_id: 'guest-uuid-1',
  invitation_id: 'inv-uuid-1',
  event_id: 'event-uuid-1',
  dietary_hard: ['vegetarian'],
  dietary_soft: ['gluten_free'],
  cuisine_likes: { italian: 0.8 },
  cuisine_avoids: ['fast_food'],
  budget_min: 1500,
  budget_max: 5000,
  vibe_tags: ['cozy'],
  dealbreaker_flags: [],
  intensity_tier: 'hard',
  weight_multiplier: 1.0,
  raw_text: 'I am vegetarian',
};

function makeGeminiResponse(candidates: unknown[]) {
  return {
    candidates: [{
      content: {
        parts: [{
          functionCall: {
            name: 'submit_restaurant_candidates',
            args: { candidates },
          },
        }],
      },
    }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
  };
}

const validCandidate = {
  place_id: 'place-1',
  name: 'Test Restaurant',
  address: '123 Main St',
  cuisine_types: ['italian'],
  price_range: '$$',
  rating: 4.2,
  review_count: 150,
  review_summary: 'Great vegetarian options and cozy ambiance.',
};

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-api-key';
  process.env.GEMINI_MODEL = 'gemini-flash';
  vi.clearAllMocks();
  vi.mocked(withRetry).mockImplementation(async (fn) => fn());
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
  vi.unstubAllGlobals();
});

describe('geminiMapsGrounding', () => {
  it('happy path: returns EnrichedCandidate[] with empty dietary_analysis and tier 1', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(makeGeminiResponse([validCandidate])),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await geminiMapsGrounding('New York, NY', [mockConstraint]);
    const result = results[0]!;

    expect(results).toHaveLength(1);
    expect(result.place_id).toBe('place-1');
    expect(result.dietary_analysis).toEqual({});
    expect(result.enrichment_tier).toBe(1);

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.toolConfig.functionCallingConfig).toMatchObject({
      mode: 'ANY',
      allowedFunctionNames: ['submit_restaurant_candidates'],
    });
    expect(body.toolConfig.functionCallingConfig).not.toHaveProperty('allowed_function_names');
  });

  it('throws PipelineError when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(geminiMapsGrounding('NYC', [mockConstraint])).rejects.toMatchObject({
      stage: 'gemini-maps-grounding',
    });
  });

  it('throws PipelineError when GEMINI_MODEL is missing', async () => {
    delete process.env.GEMINI_MODEL;

    await expect(geminiMapsGrounding('NYC', [mockConstraint])).rejects.toMatchObject({
      stage: 'gemini-maps-grounding',
    });
  });

  it('throws PipelineError on non-2xx HTTP response', async () => {
    vi.mocked(withRetry).mockImplementation(async (fn) => fn());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('bad request'),
      statusText: 'Bad Request',
    }));

    await expect(geminiMapsGrounding('NYC', [mockConstraint])).rejects.toMatchObject({
      stage: 'gemini-maps-grounding',
    });
  });

  it('throws PipelineError when response has no functionCall block', async () => {
    const badResponse = {
      candidates: [{ content: { parts: [{ text: 'Here are some restaurants...' }] } }],
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 10 },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(badResponse),
    }));

    await expect(geminiMapsGrounding('NYC', [mockConstraint])).rejects.toMatchObject({
      stage: 'gemini-maps-grounding',
    });
  });

  it('429 retry: fetch is called 3 times when first two return 429', async () => {
    vi.mocked(withRetry).mockImplementation(async (fn, retries = 2, delayMs = 1000) => {
      const retry = async (remaining: number): Promise<unknown> => {
        try {
          return await fn();
        } catch (err) {
          const e = err as { status?: number };
          if (remaining > 0 && e.status === 429) {
            await new Promise(r => setTimeout(r, Math.min(delayMs, 10)));
            return retry(remaining - 1);
          }
          throw err;
        }
      };
      return retry(retries);
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('rate limited'), statusText: '429' })
      .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('rate limited'), statusText: '429' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeGeminiResponse([validCandidate])),
      });

    vi.stubGlobal('fetch', fetchMock);

    const results = await geminiMapsGrounding('NYC', [mockConstraint]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(1);
  });

  it('throws PipelineError when candidates array is empty', async () => {
    const emptyResponse = {
      candidates: [{
        content: {
          parts: [{
            functionCall: {
              name: 'submit_restaurant_candidates',
              args: { candidates: [] },
            },
          }],
        },
      }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10 },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(emptyResponse),
    }));

    await expect(geminiMapsGrounding('NYC', [mockConstraint])).rejects.toMatchObject({
      stage: 'gemini-maps-grounding',
    });
  });

  it('calls safeLogStage exactly once on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(makeGeminiResponse([validCandidate])),
    }));

    await geminiMapsGrounding('NYC', [mockConstraint]);

    expect(safeLogStage).toHaveBeenCalledOnce();
    expect(safeLogStage).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'gemini-maps-grounding',
      provider: 'gemini',
    }));
  });
});
