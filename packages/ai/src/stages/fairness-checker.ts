import { RestaurantScore, StructuredConstraint } from '../pipeline/types';
import { safeLogStage } from '../utils/logger';

const ENVY_WARNING_THRESHOLD = 0.7;

// priceLevel === 0 means unknown price (not 'free'). Skip budget envy for unknown prices.
const UNKNOWN_PRICE_LEVEL = 0;

function computeEnvyScore(
  guest: StructuredConstraint,
  restaurant: RestaurantScore,
): number {
  let envy = 0;

  // Dietary: hard-constraint guests have high envy when dietary_score is low.
  // Note: with Tier 1 Menu Phantom data, dietary_score rarely reaches 1.0 (inferred max ~0.7),
  // so warnings will be frequent. This is intentional — warnings surface data uncertainty
  // to the reasoning engine, which incorporates them in its thinking.
  if (guest.intensity_tier === 'hard') {
    envy = restaurant.dietary_score < 1.0 ? 1.0 : 0;
  }

  // Budget: skip when price is unknown (priceLevel === 0) or guest has no budget constraint.
  if (
    restaurant.priceLevel !== UNKNOWN_PRICE_LEVEL &&
    guest.budget_max > 0 &&
    guest.budget_max < 999999
  ) {
    const budgetGap = Math.max(0, restaurant.priceLevel - guest.budget_max) / guest.budget_max;
    envy += budgetGap * 0.5;
  }

  // Vibe: low vibe match creates mild envy for all guests.
  envy += (1 - restaurant.vibeMatchScore) * 0.3;

  return Math.min(envy, 1.0);
}

export function run(
  candidates: RestaurantScore[],
  constraints: StructuredConstraint[],
): RestaurantScore[] {
  let totalWarnings = 0;

  const result = candidates.map(candidate => {
    const envy_scores: Record<string, number> = {};
    const fairness_warnings: string[] = [];

    constraints.forEach((guest, idx) => {
      const score = computeEnvyScore(guest, candidate);
      envy_scores[guest.guest_id] = score;

      if (score > ENVY_WARNING_THRESHOLD) {
        if (guest.intensity_tier === 'hard' && candidate.dietary_score < 1.0) {
          fairness_warnings.push(
            'Guest guest_' + idx + ' (hard constraint): dietary accommodation uncertain for ' + candidate.name,
          );
        }
        if (
          candidate.priceLevel !== UNKNOWN_PRICE_LEVEL &&
          guest.budget_max > 0 &&
          guest.budget_max < 999999 &&
          candidate.priceLevel > guest.budget_max
        ) {
          fairness_warnings.push(
            'Guest guest_' + idx + ': price level ' + candidate.priceLevel + 'c exceeds budget ' + guest.budget_max + 'c for ' + candidate.name,
          );
        }
      }
    });

    totalWarnings += fairness_warnings.length;
    return { ...candidate, envy_scores, fairness_warnings };
  });

  try {
    safeLogStage({
      eventId: constraints[0]?.event_id ?? 'batch',
      stage: 'fairness-checker',
      provider: 'internal',
      model: 'none',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      rawInput: { candidateCount: candidates.length, constraintCount: constraints.length },
      rawOutput: { warningCount: totalWarnings },
    });
  } catch {
    // Best effort observability only.
  }

  return result;
}

export const fairnessChecker = { run };
