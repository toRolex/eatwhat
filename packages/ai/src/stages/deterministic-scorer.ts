import { EnrichedCandidate, RestaurantScore, StructuredConstraint } from '../pipeline/types';
import { safeLogStage } from '../utils/logger';

const WEIGHTS = {
  dietary: 0.30,
  budget: 0.25,
  cuisine: 0.20,
  location: 0.15,
  review: 0.10,
} as const;

const PRICE_ESTIMATE_CENTS: Record<string, number> = {
  '$': 1500,
  '$$': 3000,
  '$$$': 5000,
  '$$$$': 8000,
};

const DIETARY_SIGNAL_SCORE = {
  grounded_high: 1.0,
  grounded_low: 0.8,
  inferred_high: 0.7,
  inferred_mid: 0.5,
  inferred_low: 0.3,
  unknown: 0.3,
} as const;

const CONFIDENCE_PENALTY = {
  unknown_hard_constraint: -0.15,
  unknown_soft_constraint: -0.08,
  inferred_low_confidence: -0.05,
  low_review_count: -0.10,
} as const;

const MIN_REVIEW_COUNT = 50;

function safeRating(r: number): number {
  if (!isFinite(r) || isNaN(r)) return 0;
  return Math.max(0, Math.min(5, r));
}

function safeReviewCount(n: number): number {
  if (!isFinite(n) || isNaN(n) || n < 0) return 0;
  return Math.floor(n);
}

type DietaryRequirement = 'hard' | 'soft';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, '_');
}

// Replaces unsafe substring matching with normalized word-token matching.
// Prevents false positives like "bar" matching "barbecue".
function textMatches(a: string, b: string): boolean {
  const tokenize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 3);
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  return tokensA.some(ta => tokensB.includes(ta));
}

function getDietaryRequirements(constraints: StructuredConstraint[]): Map<string, DietaryRequirement> {
  const requirements = new Map<string, DietaryRequirement>();

  for (const constraint of constraints) {
    for (const category of constraint.dietary_soft) {
      const normalized = normalize(category);
      if (!requirements.has(normalized)) {
        requirements.set(normalized, 'soft');
      }
    }

    for (const category of constraint.dietary_hard) {
      requirements.set(normalize(category), 'hard');
    }
  }

  return requirements;
}

function getDisqualification(
  candidate: EnrichedCandidate,
  constraints: StructuredConstraint[]
): string | undefined {
  for (const constraint of constraints) {
    if (constraint.intensity_tier !== 'hard') continue;

    for (const avoid of constraint.cuisine_avoids) {
      const match = candidate.cuisine_types.find(cuisineType => textMatches(avoid, cuisineType));
      if (match) {
        return `Hard cuisine avoidance: ${avoid} matches ${match}`;
      }
    }
  }

  const estimate = PRICE_ESTIMATE_CENTS[candidate.price_range];
  if (estimate === undefined) return undefined;

  const hardBudgetLimits = constraints
    .filter(constraint => constraint.intensity_tier === 'hard' && constraint.budget_max > 0 && constraint.budget_max < 999999)
    .map(constraint => constraint.budget_max);

  if (hardBudgetLimits.length > 0 && hardBudgetLimits.every(limit => estimate > limit * 1.5)) {
    return `Estimated price ${estimate}c exceeds all hard-budget guests limits`;
  }

  return undefined;
}

function scoreDietary(
  candidate: EnrichedCandidate,
  constraints: StructuredConstraint[],
  penalties: string[],
  bonuses: string[],
  confidenceAdjustments: number[]
): { dietaryScore: number; dietaryAnalysis: Record<string, number> } {
  const requirements = getDietaryRequirements(constraints);
  const dietaryAnalysis: Record<string, number> = {};

  if (requirements.size === 0) {
    return { dietaryScore: 1.0, dietaryAnalysis };
  }

  let total = 0;

  for (const [category, requirement] of requirements) {
    const signal = candidate.dietary_analysis[category] ?? { source: 'unknown' as const, confidence: 0 };
    let categoryScore: number;

    if (signal.source === 'grounded' && signal.confidence >= 0.9) {
      categoryScore = DIETARY_SIGNAL_SCORE.grounded_high;
      bonuses.push(`${category}: grounded high confidence`);
    } else if (signal.source === 'grounded') {
      categoryScore = DIETARY_SIGNAL_SCORE.grounded_low;
    } else if (signal.source === 'inferred' && signal.confidence >= 0.75) {
      categoryScore = DIETARY_SIGNAL_SCORE.inferred_high;
      bonuses.push(`${category}: likely accommodated`);
    } else if (signal.source === 'inferred' && signal.confidence >= 0.5) {
      categoryScore = DIETARY_SIGNAL_SCORE.inferred_mid;
    } else if (signal.source === 'inferred') {
      categoryScore = DIETARY_SIGNAL_SCORE.inferred_low;
      confidenceAdjustments.push(CONFIDENCE_PENALTY.inferred_low_confidence);
      penalties.push(`${category}: low confidence inference`);
    } else {
      categoryScore = DIETARY_SIGNAL_SCORE.unknown;
      if (requirement === 'hard') {
        confidenceAdjustments.push(CONFIDENCE_PENALTY.unknown_hard_constraint);
        penalties.push(`${category}: unknown for hard constraint`);
      } else {
        confidenceAdjustments.push(CONFIDENCE_PENALTY.unknown_soft_constraint);
        penalties.push(`${category}: unknown for soft preference`);
      }
    }

    dietaryAnalysis[category] = categoryScore;
    total += categoryScore;
  }

  return { dietaryScore: total / requirements.size, dietaryAnalysis };
}

function scoreBudget(candidate: EnrichedCandidate, constraints: StructuredConstraint[], penalties: string[]): number {
  const budgetConstraints = constraints.filter(constraint => constraint.budget_max > 0 && constraint.budget_max < 999999);

  if (budgetConstraints.length === 0) {
    return 0.75;
  }

  let weightedScore = 0;
  let totalWeight = 0;

  for (const constraint of budgetConstraints) {
    const priceEstimate = PRICE_ESTIMATE_CENTS[candidate.price_range] ?? null;
    let constraintScore: number;

    if (priceEstimate === null) {
      constraintScore = 0.5;
      penalties.push('price range unknown');
    } else if (priceEstimate <= constraint.budget_max) {
      constraintScore = 1.0;
    } else if (priceEstimate <= constraint.budget_max * 1.2) {
      constraintScore = 0.5;
      penalties.push('slightly over budget for some guests');
    } else {
      constraintScore = 0.0;
      penalties.push('over budget for some guests');
    }

    weightedScore += constraintScore * constraint.weight_multiplier;
    totalWeight += constraint.weight_multiplier;
  }

  return totalWeight > 0 ? weightedScore / totalWeight : 0.75;
}

function scoreCuisine(candidate: EnrichedCandidate, constraints: StructuredConstraint[], penalties: string[], bonuses: string[]): number {
  let bonusSum = 0;
  let penaltySum = 0;

  for (const constraint of constraints) {
    for (const [cuisine, value] of Object.entries(constraint.cuisine_likes)) {
      if (candidate.cuisine_types.some(cuisineType => textMatches(cuisine, cuisineType))) {
        bonusSum += value * constraint.weight_multiplier;
        bonuses.push(`matches ${cuisine} preference`);
      }
    }

    for (const avoid of constraint.cuisine_avoids) {
      if (candidate.cuisine_types.some(cuisineType => textMatches(avoid, cuisineType))) {
        penaltySum += 0.3;
        penalties.push(`${avoid} is in avoidance list`);
      }
    }
  }

  return clamp(0.5 + bonusSum - penaltySum, 0, 1);
}

function scoreReview(candidate: EnrichedCandidate, confidenceAdjustments: number[]): number {
  const rating = safeRating(candidate.rating);
  const reviewCount = safeReviewCount(candidate.review_count);

  if (reviewCount < MIN_REVIEW_COUNT && reviewCount > 0) {
    confidenceAdjustments.push(CONFIDENCE_PENALTY.low_review_count);
  }

  if (rating > 0 && reviewCount >= MIN_REVIEW_COUNT) {
    return clamp(rating / 5.0, 0, 1);
  }

  if (rating > 0) {
    return clamp((rating / 5.0) * 0.7, 0, 1);
  }

  return 0.5;
}

export function score(candidates: EnrichedCandidate[], constraints: StructuredConstraint[]): RestaurantScore[] {
  const results = candidates.map(candidate => {
    const penalties: string[] = [];
    const bonuses: string[] = [];
    const confidenceAdjustments: number[] = [];
    const disqualifyReason = getDisqualification(candidate, constraints);
    const { dietaryScore, dietaryAnalysis } = scoreDietary(candidate, constraints, penalties, bonuses, confidenceAdjustments);
    const budgetScore = scoreBudget(candidate, constraints, penalties);
    const cuisineScore = scoreCuisine(candidate, constraints, penalties, bonuses);
    const reviewScore = scoreReview(candidate, confidenceAdjustments);
    const locationScore = 0.5;
    const composite =
      dietaryScore * WEIGHTS.dietary +
      budgetScore * WEIGHTS.budget +
      cuisineScore * WEIGHTS.cuisine +
      locationScore * WEIGHTS.location +
      reviewScore * WEIGHTS.review;
    const confidence = clamp(1.0 + confidenceAdjustments.reduce((sum, adjustment) => sum + adjustment, 0), 0.1, 1.0);

    return {
      place_id: candidate.place_id,
      name: candidate.name,
      review_summary: candidate.review_summary,
      dietary_score: dietaryScore,
      budget_score: budgetScore,
      cuisine_score: cuisineScore,
      location_score: locationScore,
      review_score: reviewScore,
      composite,
      vibeMatchScore: 0.0,
      disqualified: disqualifyReason !== undefined,
      disqualify_reason: disqualifyReason,
      enrichedDescription: `${candidate.name} — ${candidate.cuisine_types.join(', ')} — ${candidate.price_range} — Rating: ${safeRating(candidate.rating).toFixed(1)}/5 (${safeReviewCount(candidate.review_count)} reviews) — ${(candidate.review_summary ?? '').slice(0, 120)}`,
      dietaryAnalysis,
      priceLevel: PRICE_ESTIMATE_CENTS[candidate.price_range] ?? 0,
      confidence,
      penalties,
      bonuses,
      constraintMatchSummary: `Dietary: ${dietaryScore.toFixed(2)}, Budget: ${budgetScore.toFixed(2)}, Cuisine: ${cuisineScore.toFixed(2)}, Confidence: ${confidence.toFixed(2)}`,
    };
  });

  results.sort((a, b) => {
    if (a.disqualified !== b.disqualified) {
      return a.disqualified ? 1 : -1;
    }

    return b.composite - a.composite;
  });

  try {
    safeLogStage({
      eventId: constraints[0]?.event_id ?? 'batch',
      stage: 'deterministic-scorer',
      provider: 'internal',
      model: 'none',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      rawInput: { candidateCount: candidates.length, constraintCount: constraints.length },
      rawOutput: { scoredCount: results.length, disqualifiedCount: results.filter(result => result.disqualified).length },
    });
  } catch {
    // Best effort observability only.
  }

  return results;
}

export const deterministicScorer = { score };
