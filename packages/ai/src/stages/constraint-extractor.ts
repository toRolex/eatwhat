import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { PipelineError, StructuredConstraint, ConstraintItem, ImplicitInferenceResult } from '../pipeline/types';
import { safeLogStage } from '../utils/logger';
import { withRetry } from '../utils/retry';
import type { DealbreakerOutput } from './dealbreaker-detector';

export interface RawPreference {
  guest_id: string;
  invitation_id: string;
  event_id: string;
  raw_text: string;
  weight_multiplier?: number;
}

function computeIntensityTier(items: ConstraintItem[]): 'hard' | 'strong' | 'soft' | 'inferred' {
  if (items.some(i => i.strength === 'hard')) return 'hard';
  if (items.some(i => i.strength === 'soft' && i.confidence >= 0.75)) return 'strong';
  if (items.some(i => i.strength === 'soft')) return 'soft';
  return 'inferred';
}

export async function runConstraintExtractor(
  preferences: RawPreference[],
  dealbreakers: DealbreakerOutput[],
  implicit: ImplicitInferenceResult,
): Promise<StructuredConstraint[]> {
  const model = process.env.ANTHROPIC_MODEL_FAST;
  if (!model) throw new Error('ANTHROPIC_MODEL_FAST env var is required');

  const client = new Anthropic();

  const userParts = preferences.map((pref, i) => {
    const db = dealbreakers.find(d => d.guest_id === pref.guest_id);
    return [
      `Guest guest_${i} raw_text: ${pref.raw_text}`,
      `Guest guest_${i} dealbreakers: ${JSON.stringify(db?.items ?? [])}`,
    ].join('\n');
  });
  const userMessage = [
    ...userParts,
    `Implicit inferred context: ${JSON.stringify(implicit.inferred)}`,
  ].join('\n');

  const startMs = Date.now();
  let response: Anthropic.Message;

  try {
    response = await withRetry(() =>
      client.messages.create({
        model,
        max_tokens: 4096,
        system: 'You are a constraint extractor for restaurant group planning. Given guest preferences, dealbreaker analysis, and inferred context, produce structured constraints per guest. Guest refs are guest_0, guest_1, etc — map back by index. Budget values must be in cents (multiply dollars by 100). You MUST call the extract_constraints tool.',
        tools: [
          {
            name: 'extract_constraints',
            description: 'Extract structured constraints per guest',
            input_schema: {
              type: 'object' as const,
              properties: {
                constraints: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      guest_index: { type: 'number' },
                      dietary_hard: { type: 'array', items: { type: 'string' } },
                      dietary_soft: { type: 'array', items: { type: 'string' } },
                      cuisine_likes: { type: 'object', additionalProperties: { type: 'number' } },
                      cuisine_avoids: { type: 'array', items: { type: 'string' } },
                      budget_min: { type: 'number', description: 'Minimum budget in cents, 0 if unknown' },
                      budget_max: { type: 'number', description: 'Maximum budget in cents, 999999 if unknown' },
                      vibe_tags: { type: 'array', items: { type: 'string' } },
                      dealbreaker_flags: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['guest_index','dietary_hard','dietary_soft','cuisine_likes','cuisine_avoids','budget_min','budget_max','vibe_tags','dealbreaker_flags'],
                  },
                },
              },
              required: ['constraints'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'extract_constraints' },
        messages: [{ role: 'user', content: userMessage }],
      })
    );
  } catch (err) {
    throw new PipelineError('constraint-extractor', err instanceof Error ? err : new Error(String(err)));
  }

  const latencyMs = Date.now() - startMs;

  const toolBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new PipelineError('constraint-extractor', new Error('no tool_use block in response'));
  }

  type ExtractedConstraint = {
    guest_index: number;
    dietary_hard: string[];
    dietary_soft: string[];
    cuisine_likes: Record<string, number>;
    cuisine_avoids: string[];
    budget_min: number;
    budget_max: number;
    vibe_tags: string[];
    dealbreaker_flags: string[];
  };

  const toolInput = toolBlock.input as { constraints: ExtractedConstraint[] };

  const results: StructuredConstraint[] = toolInput.constraints.map(c => {
    const pref = preferences[c.guest_index];
    if (!pref) {
      throw new PipelineError(
        'constraint-extractor',
        new Error(`invalid guest_index from extract_constraints: ${c.guest_index}`)
      );
    }

    const db = dealbreakers.find(d => d.guest_id === pref.guest_id);
    const allItems: ConstraintItem[] = [...(db?.items ?? []), ...implicit.inferred];
    const intensity_tier = computeIntensityTier(allItems);
    return {
      guest_id: pref.guest_id,
      invitation_id: pref.invitation_id,
      event_id: pref.event_id,
      dietary_hard: c.dietary_hard,
      dietary_soft: c.dietary_soft,
      cuisine_likes: c.cuisine_likes,
      cuisine_avoids: c.cuisine_avoids,
      budget_min: c.budget_min,
      budget_max: c.budget_max,
      vibe_tags: c.vibe_tags,
      dealbreaker_flags: c.dealbreaker_flags,
      intensity_tier,
      weight_multiplier: pref.weight_multiplier ?? 1.0,
      raw_text: pref.raw_text,
      items: allItems,
    };
  });

  safeLogStage({
    eventId: preferences[0]?.event_id ?? 'batch',
    stage: 'constraint-extractor',
    provider: 'anthropic',
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
    rawInput: preferences,
    rawOutput: toolInput,
  });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const dbRows = results.map(({ items: _items, ...row }) => row);
  const { error } = await supabase.from('structured_constraints').upsert(dbRows, { onConflict: 'invitation_id' });
  if (error) throw new PipelineError('constraint-extractor', error);

  return results;
}

export const constraintExtractor = { run: runConstraintExtractor };
