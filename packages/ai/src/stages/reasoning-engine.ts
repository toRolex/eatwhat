import Anthropic from '@anthropic-ai/sdk';
import {
  PipelineError,
  ProposalWithNarrative,
  RestaurantScore,
  StructuredConstraint,
  ImplicitInferenceResult,
} from '../pipeline/types';
import { buildReasoningSystemPrompt } from '../prompts/reasoning-system';
import { safeLogStage } from '../utils/logger';
import { withRetry } from '../utils/retry';

type SubmittedProposal = {
  place_id: string;
  rank: number;
  reasoning: string;
  constraints_met: string[];
  constraints_gap: string[];
  fairness_note: string;
};

const SUBMIT_PROPOSALS_TOOL = {
  name: 'submit_proposals',
  description: 'Submit the final ranked restaurant proposals.',
  input_schema: {
    type: 'object' as const,
    properties: {
      proposals: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            place_id: { type: 'string' },
            rank: { type: 'integer', enum: [1, 2, 3] },
            reasoning: { type: 'string' },
            constraints_met: { type: 'array', items: { type: 'string' } },
            constraints_gap: { type: 'array', items: { type: 'string' } },
            fairness_note: { type: 'string' },
          },
          required: ['place_id', 'rank', 'reasoning', 'constraints_met', 'constraints_gap', 'fairness_note'],
        },
      },
    },
    required: ['proposals'],
  },
};

// Replace real guest_ids with guest_N refs before any data enters an Anthropic prompt.
function anonymizeGuestKeys<T>(
  map: Record<string, T>,
  constraints: StructuredConstraint[],
): Record<string, T> {
  const idToRef = new Map(constraints.map((c, i) => [c.guest_id, `guest_${i}`]));
  return Object.fromEntries(
    Object.entries(map).flatMap(([id, v]) => {
      const ref = idToRef.get(id);
      return ref ? [[ref, v]] : [];
    })
  );
}

function buildUserMessage(
  candidates: RestaurantScore[],
  constraints: StructuredConstraint[],
  implicit: ImplicitInferenceResult,
): string {
  return JSON.stringify({
    implicit,
    constraints: constraints.map((constraint, index) => ({
      guest_ref: `guest_${index}`,
      dietary_hard: constraint.dietary_hard,
      dietary_soft: constraint.dietary_soft,
      cuisine_likes: constraint.cuisine_likes,
      cuisine_avoids: constraint.cuisine_avoids,
      budget_min: constraint.budget_min,
      budget_max: constraint.budget_max,
      vibe_tags: constraint.vibe_tags,
      dealbreaker_flags: constraint.dealbreaker_flags,
      intensity_tier: constraint.intensity_tier,
      weight_multiplier: constraint.weight_multiplier,
    })),
    candidates: candidates.map(candidate => ({
      place_id: candidate.place_id,
      name: candidate.name,
      review_summary: candidate.review_summary,
      restaurant_info: candidate.enrichedDescription,
      scores: {
        composite: candidate.composite,
        dietary: candidate.dietary_score,
        budget: candidate.budget_score,
        cuisine: candidate.cuisine_score,
        location: candidate.location_score,
        review: candidate.review_score,
        vibe: candidate.vibeMatchScore,
        confidence: candidate.confidence,
      },
      disqualified: candidate.disqualified,
      disqualify_reason: candidate.disqualify_reason,
      dietary_analysis: candidate.dietaryAnalysis,
      price_level_cents: candidate.priceLevel,
      penalties: candidate.penalties,
      bonuses: candidate.bonuses,
      constraint_match_summary: candidate.constraintMatchSummary,
      envy_scores: anonymizeGuestKeys(candidate.envy_scores ?? {}, constraints),
      fairness_warnings: candidate.fairness_warnings ?? [],
    })),
  });
}

function getToolInput(response: Anthropic.Message): { proposals: SubmittedProposal[] } {
  const toolBlock = response.content.find(block => block.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new PipelineError('reasoning-engine', new Error('no tool_use block in response'));
  }

  return toolBlock.input as { proposals: SubmittedProposal[] };
}

function constraintCoverage(candidate: RestaurantScore): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(candidate.dietaryAnalysis).map(([key, value]) => [key, value >= 0.5])
  );
}

export async function run(
  candidates: RestaurantScore[],
  constraints: StructuredConstraint[],
  implicit: ImplicitInferenceResult,
): Promise<ProposalWithNarrative[]> {
  const model = process.env.ANTHROPIC_MODEL_REASONING;
  if (!model) {
    throw new PipelineError('reasoning-engine', new Error('ANTHROPIC_MODEL_REASONING env var is required'));
  }

  const client = new Anthropic();
  const startMs = Date.now();
  let response: Anthropic.Message;

  try {
    const useExtendedThinking = process.env.ANTHROPIC_EXTENDED_THINKING === 'true';

    const createParams: Parameters<typeof client.messages.create>[0] = {
      model,
      max_tokens: 16000,
      system: buildReasoningSystemPrompt(),
      tools: [SUBMIT_PROPOSALS_TOOL],
      tool_choice: { type: 'tool', name: 'submit_proposals' },
      messages: [{ role: 'user', content: buildUserMessage(candidates, constraints, implicit) }],
      ...(useExtendedThinking ? {
        thinking: { type: 'enabled' as const, budget_tokens: 5000 },
        betas: ['interleaved-thinking-2025-05-14'] as string[],
      } : {}),
    };

    response = await withRetry(() => client.messages.create(createParams) as Promise<Anthropic.Message>);
  } catch (err) {
    throw new PipelineError('reasoning-engine', err instanceof Error ? err : new Error(String(err)));
  }

  const selected = new Map(candidates.map(candidate => [candidate.place_id, candidate]));
  const proposals = getToolInput(response).proposals
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
    .map(proposal => {
      const candidate = selected.get(proposal.place_id);
      if (!candidate) {
        throw new PipelineError('reasoning-engine', new Error(`unknown place_id from submit_proposals: ${proposal.place_id}`));
      }

      return {
        ...proposal,
        rank: proposal.rank as 1 | 2 | 3,
        envy_scores: candidate.envy_scores ?? {},
        constraint_coverage: constraintCoverage(candidate),
        narrative_group: '',
        narrative_personal: {},
        confidence_score: candidate.confidence,
      };
    });

  safeLogStage({
    eventId: constraints[0]?.event_id ?? 'batch',
    stage: 'reasoning-engine',
    provider: 'anthropic',
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs: Date.now() - startMs,
    rawInput: { candidateCount: candidates.length, constraintCount: constraints.length },
    rawOutput: { proposalCount: proposals.length },
  });

  return proposals;
}

export const reasoningEngine = { run };
