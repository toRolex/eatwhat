import Anthropic from '@anthropic-ai/sdk';
import { PipelineError, ProposalWithNarrative, StructuredConstraint } from '../pipeline/types';
import { buildNarrativeSystemPrompt } from '../prompts/narrative-system';
import { safeLogStage } from '../utils/logger';
import { withRetry } from '../utils/retry';

type NarrativeResult = {
  place_id: string;
  group: string;
  personal: Record<string, string>;
};

const GENERATE_NARRATIVES_TOOL = {
  name: 'generate_narratives',
  description: 'Write group and personal narratives for each proposal.',
  input_schema: {
    type: 'object' as const,
    properties: {
      narratives: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            place_id: { type: 'string' },
            group: { type: 'string' },
            personal: { type: 'object', additionalProperties: { type: 'string' } },
          },
          required: ['place_id', 'group', 'personal'],
        },
      },
    },
    required: ['narratives'],
  },
};

function getToolInput(response: Anthropic.Message): { narratives: NarrativeResult[] } {
  const toolBlock = response.content.find(block => block.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new PipelineError('narrative-generator', new Error('no tool_use block in response'));
  }

  return toolBlock.input as { narratives: NarrativeResult[] };
}

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
    confidence_score: p.confidence_score,
  }));
}

function mapPersonalNarratives(
  personal: Record<string, string>,
  constraints: StructuredConstraint[],
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(personal).map(([key, value]) => {
      const match = key.match(/^guest_(\d+)$/);
      if (!match) return [key, value];

      const constraint = constraints[Number(match[1])];
      return [constraint?.guest_id ?? key, value];
    })
  );
}

export async function run(
  proposals: ProposalWithNarrative[],
  constraints: StructuredConstraint[],
): Promise<ProposalWithNarrative[]> {
  const model = process.env.ANTHROPIC_MODEL_FAST;
  if (!model) {
    throw new PipelineError('narrative-generator', new Error('ANTHROPIC_MODEL_FAST env var is required'));
  }

  const client = new Anthropic();
  const startMs = Date.now();
  let response: Anthropic.Message;

  try {
    response = await withRetry(() =>
      client.messages.create({
        model,
        max_tokens: 3072,
        system: buildNarrativeSystemPrompt(),
        tools: [GENERATE_NARRATIVES_TOOL],
        tool_choice: { type: 'tool', name: 'generate_narratives' },
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
    throw new PipelineError('narrative-generator', err instanceof Error ? err : new Error(String(err)));
  }

  const narratives = new Map(getToolInput(response).narratives.map(narrative => [narrative.place_id, narrative]));
  const withNarratives = proposals.map(proposal => {
    const narrative = narratives.get(proposal.place_id);
    if (!narrative) {
      return proposal;
    }

    return {
      ...proposal,
      narrative_group: narrative.group,
      narrative_personal: mapPersonalNarratives(narrative.personal, constraints),
    };
  });

  safeLogStage({
    eventId: constraints[0]?.event_id ?? 'batch',
    stage: 'narrative-generator',
    provider: 'anthropic',
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs: Date.now() - startMs,
    rawInput: { proposalCount: proposals.length, constraintCount: constraints.length },
    rawOutput: withNarratives,
  });

  return withNarratives;
}

export const narrativeGenerator = { run };
