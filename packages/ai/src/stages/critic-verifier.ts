import Anthropic from '@anthropic-ai/sdk';
import { PipelineError, ProposalWithNarrative, RestaurantScore, StructuredConstraint } from '../pipeline/types';
import { buildCriticSystemPrompt } from '../prompts/critic-system';
import { safeLogStage } from '../utils/logger';
import { withRetry } from '../utils/retry';

type VerificationResult = {
  place_id: string;
  pass: boolean;
  issues: string[];
};

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

function sanitizeProposalsForPrompt(
  proposals: ProposalWithNarrative[],
  constraints: StructuredConstraint[],
): unknown[] {
  return proposals.map(p => ({
    place_id: p.place_id,
    rank: p.rank,
    reasoning: p.reasoning,
    constraints_met: p.constraints_met,
    constraints_gap: p.constraints_gap,
    fairness_note: p.fairness_note,
    envy_scores: anonymizeGuestKeys(p.envy_scores ?? {}, constraints),
    constraint_coverage: p.constraint_coverage,
    confidence_score: p.confidence_score,
  }));
}

const VERIFY_PROPOSALS_TOOL = {
  name: 'verify_proposals',
  description: 'Verify proposal quality and identify hard failures.',
  input_schema: {
    type: 'object' as const,
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            place_id: { type: 'string' },
            pass: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } },
          },
          required: ['place_id', 'pass', 'issues'],
        },
      },
    },
    required: ['results'],
  },
};

function getToolInput(response: Anthropic.Message): { results: VerificationResult[] } {
  const toolBlock = response.content.find(block => block.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new PipelineError('critic-verifier', new Error('no tool_use block in response'));
  }

  return toolBlock.input as { results: VerificationResult[] };
}

export async function run(
  proposals: ProposalWithNarrative[],
  constraints: StructuredConstraint[],
  candidates: RestaurantScore[],
): Promise<ProposalWithNarrative[]> {
  void candidates;

  const model = process.env.ANTHROPIC_MODEL_FAST;
  if (!model) {
    throw new PipelineError('critic-verifier', new Error('ANTHROPIC_MODEL_FAST env var is required'));
  }

  const client = new Anthropic();
  const startMs = Date.now();
  let response: Anthropic.Message;

  try {
    response = await withRetry(() =>
      client.messages.create({
        model,
        max_tokens: 2048,
        system: buildCriticSystemPrompt(),
        tools: [VERIFY_PROPOSALS_TOOL],
        tool_choice: { type: 'tool', name: 'verify_proposals' },
        messages: [{
          role: 'user',
          content: JSON.stringify({
            proposals: sanitizeProposalsForPrompt(proposals, constraints),
            constraints: constraints.map((constraint, index) => ({
              guest_ref: `guest_${index}`,
              dietary_hard: constraint.dietary_hard,
              dietary_soft: constraint.dietary_soft,
              cuisine_likes: constraint.cuisine_likes,
              cuisine_avoids: constraint.cuisine_avoids,
              budget_min: constraint.budget_min,
              budget_max: constraint.budget_max,
              vibe_tags: constraint.vibe_tags,
              intensity_tier: constraint.intensity_tier,
            })),
          }),
        }],
      })
    );
  } catch (err) {
    throw new PipelineError('critic-verifier', err instanceof Error ? err : new Error(String(err)));
  }

  const failed = new Map(
    getToolInput(response).results
      .filter(result => !result.pass)
      .map(result => [result.place_id, result.issues])
  );

  const verified = proposals
    .filter(proposal => !failed.has(proposal.place_id))
    .map((proposal, index) => ({ ...proposal, rank: (index + 1) as 1 | 2 | 3 }));

  if (verified.length === 0) {
    throw new PipelineError('critic-verifier', new Error('all proposals failed verification'));
  }

  safeLogStage({
    eventId: constraints[0]?.event_id ?? 'batch',
    stage: 'critic-verifier',
    provider: 'anthropic',
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs: Date.now() - startMs,
    rawInput: { proposalCount: proposals.length, constraintCount: constraints.length },
    rawOutput: { verifiedCount: verified.length, failed: Object.fromEntries(failed) },
  });

  return verified;
}

export const criticVerifier = { run };
