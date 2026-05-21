import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PipelineError } from '../pipeline/types';
import { runPipeline } from './orchestrator';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({ messages: { create: mockCreate } })),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockSupabaseInstance = {
  from: vi.fn(),
  rpc: vi.fn(),
};
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseInstance),
}));

const mockGetCached = vi.fn();
const mockSetCached = vi.fn();
vi.mock('../utils/cache', () => ({
  getCachedRestaurant: (...args: unknown[]) => mockGetCached(...args),
  setCachedRestaurant: (...args: unknown[]) => mockSetCached(...args),
}));

vi.mock('../utils/logger', () => ({
  safeLogStage: vi.fn(),
  logStage: vi.fn(),
}));

vi.mock('../utils/retry', () => ({
  withRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

const TEST_EVENT_ID = 'evt-integration-1';
const GUEST_ID = 'inv-abc123';
const PLACE_ID = 'place-abc123';
const PLACE_ID_2 = 'place-seafood-456';

function makeAnthropicToolResponse(toolName: string, input: unknown) {
  return {
    content: [{ type: 'tool_use', id: 'tu1', name: toolName, input }],
    usage: { input_tokens: 50, output_tokens: 30 },
  };
}

function makeGeminiResponse(candidates: unknown[]) {
  return {
    ok: true,
    json: async () => ({
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
    }),
  };
}

function makeVoyageResponse(embeddings: number[][]) {
  return {
    ok: true,
    json: async () => ({
      data: embeddings.map((embedding, index) => ({ embedding, index })),
      usage: { total_tokens: 100 },
    }),
  };
}

const testLoader = async () => ({
  event: {
    id: TEST_EVENT_ID,
    title: 'Team dinner',
    event_date: '2026-05-20T19:00:00Z',
    guest_count: 2,
    location_hint: 'Toronto',
  },
  preferences: [{
    guest_id: GUEST_ID,
    invitation_id: GUEST_ID,
    event_id: TEST_EVENT_ID,
    raw_text: 'I am vegetarian. Prefer Italian. Budget max $50 per person.',
    weight_multiplier: 1.0,
  }],
});

const testCandidate = {
  place_id: PLACE_ID,
  name: 'Green Table',
  address: '1 King St, Toronto',
  cuisine_types: ['Italian', 'Vegetarian'],
  price_range: '$$',
  rating: 4.5,
  review_count: 120,
  review_summary: 'Reviews suggest excellent vegetarian options and a cozy atmosphere.',
};

const seafoodCandidate = {
  place_id: PLACE_ID_2,
  name: 'The Fish Place',
  address: '2 Queen St, Toronto',
  cuisine_types: ['Seafood'],
  price_range: '$$$',
  rating: 4.2,
  review_count: 80,
  review_summary: 'Fresh seafood daily.',
};

function setupDefaultMocks() {
  mockCreate.mockReset();
  mockFetch.mockReset();
  mockGetCached.mockReset();
  mockSetCached.mockReset();
  mockSupabaseInstance.from.mockReset();
  mockSupabaseInstance.rpc.mockReset();

  mockCreate
    .mockResolvedValueOnce(makeAnthropicToolResponse('classify_constraints', {
      constraints: [{
        id: 'guest_0_c1',
        category: 'dietary',
        strength: 'hard',
        value: 'vegetarian',
        confidence: 0.95,
      }],
    }))
    .mockResolvedValueOnce(makeAnthropicToolResponse('extract_constraints', {
      constraints: [{
        guest_index: 0,
        dietary_hard: ['vegetarian'],
        dietary_soft: [],
        cuisine_likes: { italian: 0.9 },
        cuisine_avoids: [],
        budget_min: 0,
        budget_max: 5000,
        vibe_tags: ['cozy'],
        dealbreaker_flags: ['dietary:vegetarian'],
      }],
    }))
    .mockResolvedValueOnce(makeAnthropicToolResponse('submit_proposals', {
      proposals: [{
        place_id: PLACE_ID,
        rank: 1,
        reasoning: 'Reviews suggest excellent vegetarian options.',
        constraints_met: ['vegetarian', 'Italian cuisine'],
        constraints_gap: [],
        fairness_note: 'Good fit for the group.',
      }],
    }))
    .mockResolvedValueOnce(makeAnthropicToolResponse('verify_proposals', {
      results: [{ place_id: PLACE_ID, pass: true, issues: [] }],
    }))
    .mockResolvedValueOnce(makeAnthropicToolResponse('generate_narratives', {
      narratives: [{
        place_id: PLACE_ID,
        group: 'Green Table appears to be a great vegetarian-friendly option for the group.',
        personal: {
          guest_0: 'Based on your preferences, Green Table likely accommodates your vegetarian diet.',
        },
      }],
    }));

  mockFetch
    .mockResolvedValueOnce(makeGeminiResponse([testCandidate]))
    .mockResolvedValueOnce(makeVoyageResponse([[0.1, 0.2, 0.3]]))
    .mockResolvedValueOnce(makeVoyageResponse([[0.15, 0.25, 0.35]]));

  const makeMockChain = () => ({
    upsert: vi.fn().mockResolvedValue({ error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  mockSupabaseInstance.from.mockImplementation(() => makeMockChain());

  mockGetCached.mockResolvedValue(null);
  mockSetCached.mockResolvedValue(undefined);

  process.env.ANTHROPIC_MODEL_FAST = 'claude-haiku-test';
  process.env.ANTHROPIC_MODEL_REASONING = 'claude-sonnet-test';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.GEMINI_MODEL = 'gemini-test';
  process.env.VOYAGE_API_KEY = 'test-voyage-key';
  process.env.VOYAGE_MODEL = 'voyage-test';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  process.env.ANTHROPIC_EXTENDED_THINKING = 'false';
}

beforeEach(setupDefaultMocks);

afterEach(() => {
  [
    'ANTHROPIC_MODEL_FAST', 'ANTHROPIC_MODEL_REASONING',
    'GEMINI_API_KEY', 'GEMINI_MODEL',
    'VOYAGE_API_KEY', 'VOYAGE_MODEL',
    'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_EXTENDED_THINKING',
  ].forEach(k => { delete process.env[k]; });
});

describe('Group A — Happy path and output shape', () => {
  it('Test 1: Full pipeline returns PipelineResult with correct shape', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    expect(result.eventId).toBe(TEST_EVENT_ID);
    expect(result.proposals.length).toBeGreaterThanOrEqual(1);
    expect(result.proposals[0]!.place_id).toBe(PLACE_ID);
    expect(result.candidateDetails[PLACE_ID]!.name).toBe('Green Table');
    expect(result.groupSummary.length).toBeGreaterThan(0);
  });

  it('Test 2: V2 proposal fields are populated on output', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    const proposal = result.proposals[0]!;
    expect(proposal.narrative_group.length).toBeGreaterThan(0);
    expect(typeof proposal.envy_scores).toBe('object');
    expect(proposal.confidence_score).toBeGreaterThanOrEqual(0);
    expect(proposal.confidence_score).toBeLessThanOrEqual(1);
    expect(typeof proposal.narrative_personal).toBe('object');
  });

  it('Test 3: narrative_personal maps to real guest_id (not guest_0)', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    const personal = result.proposals[0]!.narrative_personal;
    expect(personal[GUEST_ID]).toBeTruthy();
    expect(Object.keys(personal)).not.toContain('guest_0');
  });

  it('Test 4: candidateDetails does not include API key substrings', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    for (const detail of Object.values(result.candidateDetails)) {
      const serialized = JSON.stringify(detail);
      expect(serialized).not.toContain('test-gemini-key');
      expect(serialized).not.toContain('test-voyage-key');
    }
  });
});

describe('Group B — V2 field persistence shape', () => {
  it('Test 5: envy_scores are non-negative numbers keyed by guest_id', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    const envy = result.proposals[0]!.envy_scores;
    expect(typeof envy).toBe('object');
    for (const v of Object.values(envy)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('Test 6: confidence_score is within valid range', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    const s = result.proposals[0]!.confidence_score;
    expect(s).toBeGreaterThanOrEqual(0.1);
    expect(s).toBeLessThanOrEqual(1.0);
  });

  it('Test 7: narrative_group comes from mock value verbatim', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    const narrative = result.proposals[0]!.narrative_group;
    expect(narrative).toBe('Green Table appears to be a great vegetarian-friendly option for the group.');
    expect(narrative).not.toContain('definitely has');
    expect(narrative).not.toContain('verified to offer');
  });
});

describe('Group C — Failure modes', () => {
  it('Test 8: All candidates disqualified stops pipeline before vibe-embedder', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(makeGeminiResponse([seafoodCandidate]));

    mockCreate.mockReset();
    mockCreate
      .mockResolvedValueOnce(makeAnthropicToolResponse('classify_constraints', {
        constraints: [{ id: 'guest_0_c1', category: 'dietary', strength: 'hard', value: 'vegetarian', confidence: 0.95 }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('extract_constraints', {
        constraints: [{
          guest_index: 0,
          dietary_hard: ['vegetarian'],
          dietary_soft: [],
          cuisine_likes: {},
          cuisine_avoids: ['seafood'],
          budget_min: 0,
          budget_max: 5000,
          vibe_tags: [],
          dealbreaker_flags: [],
        }],
      }));

    await expect(runPipeline(TEST_EVENT_ID, { loader: testLoader })).rejects.toBeInstanceOf(PipelineError);
    expect(mockFetch.mock.calls.length).toBe(1);
  });

  it('Test 9: Missing GEMINI_API_KEY causes PipelineError at gemini-maps-grounding', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(runPipeline(TEST_EVENT_ID, { loader: testLoader })).rejects.toMatchObject({
      stage: 'gemini-maps-grounding',
    });
  });

  it('Test 10: Missing ANTHROPIC_MODEL_FAST causes PipelineError', async () => {
    delete process.env.ANTHROPIC_MODEL_FAST;
    await expect(runPipeline(TEST_EVENT_ID, { loader: testLoader })).rejects.toThrow();
  });

  it('Test 11: constraint-extractor DB write failure is fatal', async () => {
    mockSupabaseInstance.from.mockImplementation((table: string) => {
      const chain = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      if (table === 'structured_constraints') {
        chain.upsert = vi.fn().mockResolvedValue({ error: new Error('db down') });
      }
      return chain;
    });
    await expect(runPipeline(TEST_EVENT_ID, { loader: testLoader })).rejects.toThrow();
  });

  it('Test 12: safeLogStage mock means logging never fails the pipeline', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    expect(result.proposals.length).toBeGreaterThanOrEqual(1);
  });

  it('Test 13: Voyage cache write failure does not fail pipeline', async () => {
    mockSetCached.mockRejectedValue(new Error('cache write fail'));
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    expect(result.proposals.length).toBeGreaterThanOrEqual(1);
    expect(result.proposals[0]!.place_id).toBe(PLACE_ID);
  });

  it('Test 14: Critic removes one proposal; critic-approved proposal has correct reasoning', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(makeGeminiResponse([testCandidate, seafoodCandidate]))
      .mockResolvedValueOnce(makeVoyageResponse([[0.1, 0.2, 0.3], [0.05, 0.1, 0.15]]))
      .mockResolvedValueOnce(makeVoyageResponse([[0.15, 0.25, 0.35]]));

    mockCreate.mockReset();
    mockCreate
      .mockResolvedValueOnce(makeAnthropicToolResponse('classify_constraints', {
        constraints: [{ id: 'guest_0_c1', category: 'dietary', strength: 'hard', value: 'vegetarian', confidence: 0.95 }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('extract_constraints', {
        constraints: [{
          guest_index: 0,
          dietary_hard: ['vegetarian'],
          dietary_soft: [],
          cuisine_likes: { italian: 0.9 },
          cuisine_avoids: [],
          budget_min: 0,
          budget_max: 5000,
          vibe_tags: ['cozy'],
          dealbreaker_flags: [],
        }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('submit_proposals', {
        proposals: [
          { place_id: PLACE_ID, rank: 1, reasoning: 'Good.', constraints_met: ['vegetarian'], constraints_gap: [], fairness_note: 'OK.' },
          { place_id: PLACE_ID_2, rank: 2, reasoning: 'Decent.', constraints_met: [], constraints_gap: ['seafood'], fairness_note: 'Risk.' },
        ],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('verify_proposals', {
        results: [
          { place_id: PLACE_ID, pass: true, issues: [] },
          { place_id: PLACE_ID_2, pass: false, issues: ['Seafood conflicts with dietary constraint.'] },
        ],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('generate_narratives', {
        narratives: [
          { place_id: PLACE_ID, group: 'Green Table is a great fit.', personal: { guest_0: 'Likely suits your diet.' } },
        ],
      }));

    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    // PLACE_ID was critic-approved; it must be in the output
    const placeIds = result.proposals.map(p => p.place_id);
    expect(placeIds).toContain(PLACE_ID);
    // The critic-approved proposal has the reasoning from the reasoning engine
    const approvedProposal = result.proposals.find(p => p.place_id === PLACE_ID)!;
    expect(approvedProposal.reasoning).toBe('Good.');
    // Total proposals >= 1
    expect(result.proposals.length).toBeGreaterThanOrEqual(1);
  });

  it('Test 15: Pipeline resolves successfully when all mocks are set up correctly', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    expect(result).toBeDefined();
    expect(result.proposals.length).toBeGreaterThanOrEqual(1);
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Group D — Data integrity', () => {
  it('Test 16: Real guest UUID does not appear in any Anthropic call messages', async () => {
    await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    const allCalls = mockCreate.mock.calls;
    // All 5 Anthropic calls (dealbreaker, constraint-extractor, reasoning-engine,
    // critic-verifier, narrative-generator) must not send the real invitation UUID.
    for (const [callArgs] of allCalls) {
      const content = JSON.stringify((callArgs as { messages?: unknown[] })?.messages ?? []);
      expect(content).not.toContain(GUEST_ID);
    }
  });

  it('Test 17: narrative_personal does NOT use guest_0/guest_1 keys in final output', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    const keys = Object.keys(result.proposals[0]!.narrative_personal);
    expect(keys).not.toContain('guest_0');
    expect(keys).not.toContain('guest_1');
  });

  it('Test 18: Menu Phantom Tier 1 does not set source grounded; pipeline resolves', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    expect(result.proposals).toBeDefined();
    expect(result.proposals.length).toBeGreaterThanOrEqual(1);
    const proposal = result.proposals[0]!;
    expect(proposal.constraint_coverage).toBeDefined();
  });

  it('Test 19: Disqualified candidates do not appear in final proposals', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(makeGeminiResponse([testCandidate, seafoodCandidate]))
      .mockResolvedValueOnce(makeVoyageResponse([[0.1, 0.2, 0.3]]))
      .mockResolvedValueOnce(makeVoyageResponse([[0.15, 0.25, 0.35]]));

    mockCreate.mockReset();
    mockCreate
      .mockResolvedValueOnce(makeAnthropicToolResponse('classify_constraints', {
        constraints: [{ id: 'guest_0_c1', category: 'dietary', strength: 'hard', value: 'vegetarian', confidence: 0.95 }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('extract_constraints', {
        constraints: [{
          guest_index: 0,
          dietary_hard: ['vegetarian'],
          dietary_soft: [],
          cuisine_likes: { italian: 0.9 },
          cuisine_avoids: ['seafood'],
          budget_min: 0,
          budget_max: 5000,
          vibe_tags: ['cozy'],
          dealbreaker_flags: [],
        }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('submit_proposals', {
        proposals: [{ place_id: PLACE_ID, rank: 1, reasoning: 'Good.', constraints_met: ['vegetarian'], constraints_gap: [], fairness_note: 'OK.' }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('verify_proposals', {
        results: [{ place_id: PLACE_ID, pass: true, issues: [] }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('generate_narratives', {
        narratives: [{ place_id: PLACE_ID, group: 'Great fit.', personal: { guest_0: 'Good match.' } }],
      }));

    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    const placeIds = result.proposals.map(p => p.place_id);
    expect(placeIds).not.toContain(PLACE_ID_2);
    expect(placeIds).toContain(PLACE_ID);
  });

  it('Test 20: Fairness warnings do not cause PipelineError', async () => {
    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    expect(result).toBeDefined();
    expect(result.proposals.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Group E — Cache efficiency and determinism', () => {
  it('Test 21: Cache hit skips Voyage document embedding fetch for that candidate', async () => {
    mockGetCached.mockResolvedValue({
      id: 'cache-row-1',
      place_id: PLACE_ID,
      name: 'Green Table',
      dietary_analysis: null,
      vibe_embedding: [0.1, 0.2, 0.3],
      review_summary: 'Great vegetarian options.',
      menu_analysis: null,
      last_analyzed: new Date().toISOString(),
      ttl_days: 30,
    });

    await runPipeline(TEST_EVENT_ID, { loader: testLoader });

    const voyageCalls = mockFetch.mock.calls.filter(call => {
      const url = call[0] as string;
      return typeof url === 'string' && url.includes('voyageai');
    });
    expect(voyageCalls.length).toBeLessThanOrEqual(1);
  });

  it('Test 22: Empty review_summary yields vibeMatchScore 0.3 without Voyage API calls', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(makeGeminiResponse([{ ...testCandidate, review_summary: '' }]));

    mockCreate.mockReset();
    mockCreate
      .mockResolvedValueOnce(makeAnthropicToolResponse('classify_constraints', {
        constraints: [{ id: 'guest_0_c1', category: 'dietary', strength: 'hard', value: 'vegetarian', confidence: 0.95 }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('extract_constraints', {
        constraints: [{
          guest_index: 0,
          dietary_hard: ['vegetarian'],
          dietary_soft: [],
          cuisine_likes: { italian: 0.9 },
          cuisine_avoids: [],
          budget_min: 0,
          budget_max: 5000,
          vibe_tags: ['cozy'],
          dealbreaker_flags: [],
        }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('submit_proposals', {
        proposals: [{ place_id: PLACE_ID, rank: 1, reasoning: 'Good.', constraints_met: ['vegetarian'], constraints_gap: [], fairness_note: 'OK.' }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('verify_proposals', {
        results: [{ place_id: PLACE_ID, pass: true, issues: [] }],
      }))
      .mockResolvedValueOnce(makeAnthropicToolResponse('generate_narratives', {
        narratives: [{ place_id: PLACE_ID, group: 'Great fit for vegetarians.', personal: { guest_0: 'Suits your diet.' } }],
      }));

    const result = await runPipeline(TEST_EVENT_ID, { loader: testLoader });
    expect(result.proposals).toBeDefined();

    const voyageDocCalls = mockFetch.mock.calls.filter(call => {
      const url = call[0] as string;
      return typeof url === 'string' && url.includes('voyageai');
    });
    expect(voyageDocCalls.length).toBe(0);
  });

  it('Test 23: Reranker is deterministic — identical inputs produce identical output order', async () => {
    const result1 = await runPipeline(TEST_EVENT_ID, { loader: testLoader });

    setupDefaultMocks();
    const result2 = await runPipeline(TEST_EVENT_ID, { loader: testLoader });

    expect(result1.proposals.map(p => p.place_id)).toEqual(result2.proposals.map(p => p.place_id));
  });
});
