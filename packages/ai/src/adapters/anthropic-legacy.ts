import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, SynthesisInput, SynthesisOutput } from '../interface';
import { buildSynthesisPrompt } from '../prompts/restaurant-synthesis';

// Published per-MTok rates in USD for the models we use.
// Update when Anthropic changes pricing — the cost figures rendered to the
// host are best-effort estimates, not invoiced amounts.
const PRICING: Record<string, { in: number; out: number }> = {
  'claude-haiku-4-5-20251001':  { in: 1.00, out: 5.00 },
  'claude-sonnet-4-6':           { in: 3.00, out: 15.00 },
  'claude-opus-4-7':             { in: 15.00, out: 75.00 },
};
const MODEL = 'claude-haiku-4-5-20251001';

export class ClaudeAIProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 2 });
  }

  async synthesizeRestaurantProposals(input: SynthesisInput): Promise<SynthesisOutput> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      // Pre-fill the assistant message with `{` so Claude is forced to continue
      // valid JSON instead of wrapping in markdown fences.
      messages: [
        { role: 'user',      content: buildSynthesisPrompt(input) },
        { role: 'assistant', content: '{' },
      ],
    });

    const block = response.content[0];
    if (!block || block.type !== 'text') {
      throw new Error('Unexpected response shape from Claude');
    }

    // Re-add the leading `{` we pre-filled, and strip any trailing markdown.
    const raw = '{' + block.text;
    const jsonText = extractJson(raw);

    let parsed: SynthesisOutput;
    try {
      parsed = JSON.parse(jsonText) as SynthesisOutput;
    } catch (err) {
      const preview = jsonText.slice(0, 300);
      throw new Error(`Claude returned non-JSON output (parse error: ${(err as Error).message}): ${preview}`);
    }

    const expected = Math.max(3, Math.min(10, input.count ?? 5));
    if (!Array.isArray(parsed.proposals) || parsed.proposals.length !== expected) {
      throw new Error(`Claude did not return exactly ${expected} proposals (got ${parsed.proposals?.length ?? 0})`);
    }

    const validIds = new Set(input.candidates.map((c) => c.id));
    const seenIds  = new Set<string>();
    for (const proposal of parsed.proposals) {
      if (!validIds.has(proposal.candidate_id)) {
        throw new Error(`Claude returned unknown candidate_id: ${proposal.candidate_id}`);
      }
      if (seenIds.has(proposal.candidate_id)) {
        throw new Error(`Claude returned duplicate candidate_id: ${proposal.candidate_id}`);
      }
      seenIds.add(proposal.candidate_id);
    }

    const inTok  = response.usage?.input_tokens ?? 0;
    const outTok = response.usage?.output_tokens ?? 0;
    const rate   = PRICING[MODEL] ?? { in: 0, out: 0 };
    const costMicros = Math.round((inTok * rate.in + outTok * rate.out));

    return {
      proposals: parsed.proposals,
      usage: { model: MODEL, input_tokens: inTok, output_tokens: outTok, cost_micros: costMicros },
    };
  }
}

// Strip markdown code fences and trim to the outermost { ... }
function extractJson(text: string): string {
  let s = text.trim();

  // Remove ```json ... ``` or ``` ... ``` wrapping if present
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  const first = s.indexOf('{');
  const last  = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return s.slice(first, last + 1);
  }
  return s;
}
