import { PipelineError, StructuredConstraint, EnrichedCandidate, DietaryAnalysis, DietarySignal } from '../pipeline/types';
import { safeLogStage } from '../utils/logger';
import { getCachedRestaurant, setCachedRestaurant } from '../utils/cache';

export async function tier2(): Promise<never> {
  throw new PipelineError('menu-phantom-tier2', new Error('not implemented'));
}

export async function tier3(): Promise<never> {
  throw new PipelineError('menu-phantom-tier3', new Error('not implemented'));
}

type KeywordEntry = { keywords: string[]; highConfidencePhrases: string[] };

const DIETARY_KEYWORD_MAP: Record<string, KeywordEntry> = {
  vegetarian: {
    keywords: ['vegetarian', 'veggie', 'meat-free', 'meatless'],
    highConfidencePhrases: ['fully vegetarian', '100% vegetarian', 'vegetarian restaurant', 'vegetarian menu'],
  },
  vegan: {
    keywords: ['vegan', 'plant-based', 'plant based'],
    highConfidencePhrases: ['100% vegan', 'fully vegan', 'dedicated vegan', 'vegan restaurant'],
  },
  gluten_free: {
    keywords: ['gluten-free', 'gluten free', 'gluten friendly'],
    highConfidencePhrases: ['dedicated gluten-free kitchen', 'certified gluten-free', 'strictly gluten-free'],
  },
  nut_free: {
    keywords: ['nut-free', 'nut free', 'no nuts', 'peanut-free'],
    highConfidencePhrases: ['certified nut-free', 'strictly nut-free', 'nut-free kitchen'],
  },
  halal: {
    keywords: ['halal'],
    highConfidencePhrases: ['certified halal', 'halal certified', 'fully halal'],
  },
  kosher: {
    keywords: ['kosher'],
    highConfidencePhrases: ['certified kosher', 'kosher certified', 'fully kosher'],
  },
  dairy_free: {
    keywords: ['dairy-free', 'dairy free', 'lactose-free', 'lactose free'],
    highConfidencePhrases: ['dedicated dairy-free', 'certified dairy-free', '100% dairy-free'],
  },
};

function getRequiredCategories(constraints: StructuredConstraint[]): Set<string> {
  const cats = new Set<string>();
  for (const c of constraints) {
    for (const d of [...c.dietary_hard, ...c.dietary_soft]) {
      const normalized = d.toLowerCase().replace(/[- ]/g, '_');
      cats.add(normalized);
      cats.add(d.toLowerCase());
    }
  }
  return cats;
}

function intersectWithKnownCategories(requested: Set<string>): string[] {
  return Object.keys(DIETARY_KEYWORD_MAP).filter(k => requested.has(k));
}

function analyzeReviewSummary(reviewSummary: string, categories: string[]): DietaryAnalysis {
  const text = reviewSummary.toLowerCase();
  const analysis: DietaryAnalysis = {};

  for (const category of categories) {
    const entry = DIETARY_KEYWORD_MAP[category];
    if (!entry) continue;

    const highMatch = entry.highConfidencePhrases.find(phrase => text.includes(phrase.toLowerCase()));
    if (highMatch) {
      const signal: DietarySignal = { source: 'inferred', confidence: 0.85, evidence: highMatch };
      analysis[category] = signal;
      continue;
    }

    const lowMatch = entry.keywords.find(kw => text.includes(kw.toLowerCase()));
    if (lowMatch) {
      const signal: DietarySignal = { source: 'inferred', confidence: 0.6, evidence: 'mentioned in review summary' };
      analysis[category] = signal;
      continue;
    }

    const signal: DietarySignal = { source: 'unknown', confidence: 0 };
    analysis[category] = signal;
  }

  return analysis;
}

export async function enrich(
  candidates: EnrichedCandidate[],
  constraints: StructuredConstraint[],
): Promise<EnrichedCandidate[]> {
  const startMs = Date.now();

  const requestedCategories = getRequiredCategories(constraints);
  const categoriesToCheck = intersectWithKnownCategories(requestedCategories);

  const results: EnrichedCandidate[] = [];

  for (const candidate of candidates) {
    const cached = await getCachedRestaurant(candidate.place_id);

    if (cached && cached.dietary_analysis !== null) {
      safeLogStage({
        eventId: constraints[0]?.event_id ?? 'batch',
        stage: 'menu-phantom-cache-hit',
        provider: 'internal',
        model: 'none',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        rawInput: { place_id: candidate.place_id },
        rawOutput: { cached: true },
      });
      results.push({
        ...candidate,
        dietary_analysis: cached.dietary_analysis as DietaryAnalysis,
        enrichment_tier: 1,
      });
      continue;
    }

    const dietaryAnalysis = analyzeReviewSummary(candidate.review_summary, categoriesToCheck);

    try {
      await setCachedRestaurant(candidate.place_id, {
        name: candidate.name,
        dietary_analysis: dietaryAnalysis,
        review_summary: candidate.review_summary,
      });
    } catch (err) {
      safeLogStage({
        eventId: constraints[0]?.event_id ?? 'batch',
        stage: 'menu-phantom-cache-write-error',
        provider: 'internal',
        model: 'none',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        rawInput: { place_id: candidate.place_id },
        rawOutput: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    results.push({
      ...candidate,
      dietary_analysis: dietaryAnalysis,
      enrichment_tier: 1,
    });
  }

  const enrichedCount = results.filter(r => Object.keys(r.dietary_analysis).length > 0).length;

  safeLogStage({
    eventId: constraints[0]?.event_id ?? 'batch',
    stage: 'menu-phantom',
    provider: 'internal',
    model: 'none',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: Date.now() - startMs,
    rawInput: { candidateCount: candidates.length, constraintCount: constraints.length },
    rawOutput: { enrichedCount },
  });

  return results;
}

export const menuPhantom = enrich;
