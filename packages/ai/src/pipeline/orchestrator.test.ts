import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PipelineError, type EnrichedCandidate, type ProposalWithNarrative, type RestaurantScore, type StructuredConstraint } from './types';
import type { LoadedEventData } from './orchestrator';

const mocks = vi.hoisted(() => ({
  order: [] as string[],
  dealbreakerRun: vi.fn(),
  implicitRun: vi.fn(),
  constraintRun: vi.fn(),
  geminiMapsGrounding: vi.fn(),
  menuPhantom: vi.fn(),
  deterministicScore: vi.fn(),
  vibeRun: vi.fn(),
  rerankerRun: vi.fn(),
  fairnessRun: vi.fn(),
  reasoningRun: vi.fn(),
  criticRun: vi.fn(),
  narrativeRun: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('../stages/dealbreaker-detector', () => ({ dealbreakerDetector: { run: mocks.dealbreakerRun } }));
vi.mock('../stages/implicit-inference', () => ({ implicitInference: { run: mocks.implicitRun } }));
vi.mock('../stages/constraint-extractor', () => ({ constraintExtractor: { run: mocks.constraintRun } }));
vi.mock('../adapters/gemini', () => ({ geminiMapsGrounding: mocks.geminiMapsGrounding }));
vi.mock('../stages/menu-phantom', () => ({ menuPhantom: mocks.menuPhantom }));
vi.mock('../stages/deterministic-scorer', () => ({ deterministicScorer: { score: mocks.deterministicScore } }));
vi.mock('../stages/vibe-embedder', () => ({ vibeEmbedder: { run: mocks.vibeRun } }));
vi.mock('../stages/reranker', () => ({ reranker: { run: mocks.rerankerRun } }));
vi.mock('../stages/fairness-checker', () => ({ fairnessChecker: { run: mocks.fairnessRun } }));
vi.mock('../stages/reasoning-engine', () => ({ reasoningEngine: { run: mocks.reasoningRun } }));
vi.mock('../stages/critic-verifier', () => ({ criticVerifier: { run: mocks.criticRun } }));
vi.mock('../stages/narrative-generator', () => ({ narrativeGenerator: { run: mocks.narrativeRun } }));

import { runPipeline } from './orchestrator';

function loadedEventData(): LoadedEventData {
  return {
    event: {
      id: 'evt1',
      title: 'Team dinner',
      event_date: '2026-05-20T18:00:00Z',
      guest_count: 2,
      location_hint: 'Toronto',
    },
    preferences: [
      { guest_id: 'inv1', invitation_id: 'inv1', event_id: 'evt1', raw_text: 'Vegetarian', weight_multiplier: 1 },
    ],
  };
}

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

const candidate: EnrichedCandidate = {
  place_id: 'place1',
  name: 'Green Table',
  address: '1 Main St',
  cuisine_types: ['vegetarian'],
  price_range: '$$',
  rating: 4.5,
  review_count: 100,
  review_summary: 'Reviews suggest vegetarian options.',
  dietary_analysis: {},
  enrichment_tier: 1,
  image_url: 'https://example.com/img.jpg',
  maps_url: 'https://maps.example.com',
};

const score: RestaurantScore = {
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
  envy_scores: { inv1: 0 },
  fairness_warnings: [],
};

const proposal: ProposalWithNarrative = {
  place_id: 'place1',
  rank: 1,
  reasoning: 'Best group fit.',
  constraints_met: ['vegetarian'],
  constraints_gap: [],
  fairness_note: 'Fair fit.',
  envy_scores: { inv1: 0 },
  constraint_coverage: { vegetarian: true },
  narrative_group: '',
  narrative_personal: {},
  confidence_score: 0.9,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.order.length = 0;
  mocks.dealbreakerRun.mockImplementation(async () => {
    mocks.order.push('dealbreaker');
    return [{ guest_id: 'inv1', items: [] }];
  });
  mocks.implicitRun.mockImplementation(() => {
    mocks.order.push('implicit');
    return { context: { event_type_hint: 'work', meal_type: 'dinner', formality_bias: 0.5, group_size_class: 'small' }, inferred: [] };
  });
  mocks.constraintRun.mockImplementation(async () => {
    mocks.order.push('constraint');
    return [constraint];
  });
  mocks.geminiMapsGrounding.mockResolvedValue([candidate]);
  mocks.menuPhantom.mockResolvedValue([candidate]);
  mocks.deterministicScore.mockReturnValue([score]);
  mocks.vibeRun.mockResolvedValue([score]);
  mocks.rerankerRun.mockResolvedValue([score]);
  mocks.fairnessRun.mockReturnValue([score]);
  mocks.reasoningRun.mockResolvedValue([proposal]);
  mocks.criticRun.mockResolvedValue([proposal]);
  mocks.narrativeRun.mockResolvedValue([{ ...proposal, narrative_group: 'Great fit.', narrative_personal: { inv1: 'Likely fits.' } }]);
});

describe('runPipeline', () => {
  it('returns the correct pipeline result shape', async () => {
    const result = await runPipeline('evt1', { loader: vi.fn().mockResolvedValue(loadedEventData()) });

    expect(result).toMatchObject({
      eventId: 'evt1',
      proposals: [expect.objectContaining({ place_id: 'place1', narrative_group: 'Great fit.' })],
      groupSummary: 'Great fit.',
      conflictsResolved: [],
      totalCostMicros: 0,
      candidateDetails: { place1: expect.objectContaining({ name: 'Green Table' }) },
    });
    expect(result.totalLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('calls the injectable loader', async () => {
    const mockLoader = vi.fn().mockResolvedValue(loadedEventData());

    await runPipeline('evt1', { loader: mockLoader });

    expect(mockLoader).toHaveBeenCalledWith('evt1');
  });

  it('populates candidateDetails from grounded candidates', async () => {
    const result = await runPipeline('evt1', { loader: vi.fn().mockResolvedValue(loadedEventData()) });

    expect(result.candidateDetails.place1).toEqual({
      name: 'Green Table',
      address: '1 Main St',
      cuisine_types: ['vegetarian'],
      price_range: '$$',
      rating: 4.5,
      review_summary: 'Reviews suggest vegetarian options.',
      image_url: 'https://example.com/img.jpg',
      maps_url: 'https://maps.example.com',
    });
  });

  it('uses locationHint option for candidate discovery', async () => {
    await runPipeline('evt1', {
      loader: vi.fn().mockResolvedValue(loadedEventData()),
      locationHint: 'Montreal',
    });

    expect(mocks.geminiMapsGrounding).toHaveBeenCalledWith('Montreal', [constraint]);
  });

  it('runs dealbreaker before constraint extraction', async () => {
    await runPipeline('evt1', { loader: vi.fn().mockResolvedValue(loadedEventData()) });

    expect(mocks.order.indexOf('dealbreaker')).toBeLessThan(mocks.order.indexOf('constraint'));
  });

  it('throws PipelineError when all candidates are disqualified', async () => {
    mocks.deterministicScore.mockReturnValue([{ ...score, disqualified: true, disqualify_reason: 'hard conflict' }]);

    await expect(runPipeline('evt1', { loader: vi.fn().mockResolvedValue(loadedEventData()) })).rejects.toBeInstanceOf(PipelineError);
  });

  it('propagates constraint extractor PipelineError', async () => {
    const err = new PipelineError('constraint-extractor', new Error('bad constraints'));
    mocks.constraintRun.mockRejectedValue(err);

    await expect(runPipeline('evt1', { loader: vi.fn().mockResolvedValue(loadedEventData()) })).rejects.toBe(err);
  });

  it('keeps disqualified candidates out of downstream proposal selection', async () => {
    const disqualified = { ...score, place_id: 'bad', disqualified: true, disqualify_reason: 'hard conflict' };
    mocks.deterministicScore.mockReturnValue([disqualified, score]);

    await runPipeline('evt1', { loader: vi.fn().mockResolvedValue(loadedEventData()) });

    expect(mocks.vibeRun).toHaveBeenCalledWith([score], [constraint]);
    expect(mocks.reasoningRun).toHaveBeenCalledWith([score], [constraint], expect.any(Object));
  });

  it('throws PipelineError when Gemini returns empty and scoring leaves no qualified candidates', async () => {
    mocks.geminiMapsGrounding.mockResolvedValue([]);
    mocks.menuPhantom.mockResolvedValue([]);
    mocks.deterministicScore.mockReturnValue([]);

    await expect(runPipeline('evt1', { loader: vi.fn().mockResolvedValue(loadedEventData()) })).rejects.toBeInstanceOf(PipelineError);
  });

  it('fills critic-removed slots from fairnessAnnotated alternates up to MAX_PROPOSALS', async () => {
    const alt: RestaurantScore = {
      place_id: 'alt1',
      name: 'Alt Restaurant',
      review_summary: '',
      dietary_score: 0.8,
      budget_score: 0.8,
      cuisine_score: 0.7,
      location_score: 0.5,
      review_score: 0.7,
      composite: 0.75,
      vibeMatchScore: 0.6,
      disqualified: false,
      enrichedDescription: 'Alt Restaurant italian $$',
      dietaryAnalysis: { vegetarian: 0.8 },
      priceLevel: 3000,
      confidence: 0.85,
      penalties: ['minor issue'],
      bonuses: ['great vibe'],
      constraintMatchSummary: 'good alt',
      envy_scores: { inv1: 0.1 },
      fairness_warnings: [],
    };

    // critic removes place1, leaving 0 proposals (but we still need to test the fill path)
    // Actually, critic should return 1 proposal and fairnessAnnotated should have 2
    const partialProposal = { ...proposal, rank: 1 as const };
    mocks.criticRun.mockResolvedValue([partialProposal]);
    mocks.fairnessRun.mockReturnValue([score, alt]);
    mocks.rerankerRun.mockResolvedValue([score, alt]);
    mocks.narrativeRun.mockImplementation(async (verified: ProposalWithNarrative[]) =>
      verified.map(p => ({ ...p, narrative_group: 'Summary.', narrative_personal: {} }))
    );

    const result = await runPipeline('evt1', { loader: vi.fn().mockResolvedValue(loadedEventData()) });

    expect(result.proposals).toHaveLength(2);
    expect(result.proposals.some(p => p.place_id === 'alt1')).toBe(true);
  });

  it('groupSummary falls back to candidate names when narrative_group is empty', async () => {
    mocks.narrativeRun.mockResolvedValue([
      { ...proposal, narrative_group: '', narrative_personal: {} },
    ]);

    const result = await runPipeline('evt1', { loader: vi.fn().mockResolvedValue(loadedEventData()) });

    expect(result.groupSummary).toBe('Green Table');
    expect(result.groupSummary).not.toBe('');
  });
});
