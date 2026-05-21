import { RestaurantScore, StructuredConstraint } from '../pipeline/types';
import { safeLogStage } from '../utils/logger';

const TOP_N = 5;

const RERANK_WEIGHTS = {
  composite: 0.50,
  confidence: 0.25,
  vibeMatch: 0.25,
} as const;

function rerankScore(candidate: RestaurantScore): number {
  return (
    candidate.composite * RERANK_WEIGHTS.composite +
    candidate.confidence * RERANK_WEIGHTS.confidence +
    candidate.vibeMatchScore * RERANK_WEIGHTS.vibeMatch
  );
}

export async function run(
  candidates: RestaurantScore[],
  constraints: StructuredConstraint[],
): Promise<RestaurantScore[]> {
  void constraints;

  const qualified = candidates
    .filter(c => !c.disqualified)
    .sort((a, b) => rerankScore(b) - rerankScore(a));

  const result = qualified.slice(0, TOP_N);

  try {
    safeLogStage({
      eventId: '',
      stage: 'reranker',
      provider: 'internal',
      model: 'none',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      rawInput: { candidateCount: candidates.length },
      rawOutput: { selectedCount: result.length },
    });
  } catch {
    // best-effort observability — never fail the stage
  }

  return result;
}

export const reranker = { run };
