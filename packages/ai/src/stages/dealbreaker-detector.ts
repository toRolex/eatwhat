import Anthropic from '@anthropic-ai/sdk';
import { PipelineError, ConstraintItem } from '../pipeline/types';
import { safeLogStage } from '../utils/logger';
import { withRetry } from '../utils/retry';

export interface DealbreakerInput {
  guest_id: string;
  raw_text: string;
}

export interface DealbreakerOutput {
  guest_id: string;
  items: ConstraintItem[];
}

export async function runDealbreakerDetector(inputs: DealbreakerInput[]): Promise<DealbreakerOutput[]> {
  const model = process.env.ANTHROPIC_MODEL_FAST;
  if (!model) throw new Error('ANTHROPIC_MODEL_FAST env var is required');

  const client = new Anthropic();

  const userMessage = inputs
    .map((inp, i) => `Guest guest_${i}: ${inp.raw_text}`)
    .join('\n') + '\n\nPrefix each constraint id with the guest index, e.g. guest_0_constraint_1, guest_1_constraint_0.';

  const startMs = Date.now();
  let response: Anthropic.Message;

  try {
    response = await withRetry(() =>
      client.messages.create({
        model,
        max_tokens: 2048,
        system: 'You are a constraint classifier for restaurant group planning. Analyze guest preferences and classify each constraint. Rules: (1) "I am allergic to X" / "I cannot eat X" / any medical context -> hard, category=allergy or dietary, confidence>=0.9. (2) "I do not eat X" / "NO X" / "never X" / vegetarian/vegan/halal/kosher -> hard, category=dietary, confidence>=0.85. (3) "max /person" / "cannot spend more than " -> hard, category=budget. (4) "I would prefer" / "would be nice" / "I like" / "I enjoy" -> soft. (5) Contextual signals like "date night", "somewhere chill" -> inferred. (6) Ambiguous or unclear -> unknown, confidence<0.5. When in doubt, escalate — false positive is safer than false negative. You MUST call the classify_constraints tool.',
        tools: [
          {
            name: 'classify_constraints',
            description: 'Classify guest preference constraints',
            input_schema: {
              type: 'object' as const,
              properties: {
                constraints: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      category: { type: 'string', enum: ['dietary','allergy','budget','location','time','cuisine','accessibility','ambiance','service_speed','other'] },
                      strength: { type: 'string', enum: ['hard','soft','inferred','unknown'] },
                      value: { type: 'string' },
                      sourceText: { type: 'string' },
                      confidence: { type: 'number' },
                      reason: { type: 'string' },
                    },
                    required: ['id','category','strength','value','confidence'],
                  },
                },
              },
              required: ['constraints'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'classify_constraints' },
        messages: [{ role: 'user', content: userMessage }],
      })
    );
  } catch (err) {
    throw new PipelineError('dealbreaker-detector', err instanceof Error ? err : new Error(String(err)));
  }

  const latencyMs = Date.now() - startMs;

  const toolBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new PipelineError('dealbreaker-detector', new Error('no tool_use block in response'));
  }

  const toolInput = toolBlock.input as { constraints: ConstraintItem[] };
  const allConstraints: ConstraintItem[] = toolInput.constraints ?? [];

  const result: DealbreakerOutput[] = inputs.map((inp, i) => ({
    guest_id: inp.guest_id,
    items: allConstraints.filter(c => c.id.startsWith(`guest_${i}_`)),
  }));

  safeLogStage({
    eventId: 'batch',
    stage: 'dealbreaker-detector',
    provider: 'anthropic',
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
    rawInput: inputs,
    rawOutput: result,
  });

  return result;
}

export const dealbreakerDetector = { run: runDealbreakerDetector };
