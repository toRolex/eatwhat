import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, SynthesisInput, SynthesisOutput } from '../interface';
import { buildSynthesisPrompt } from '../prompts/restaurant-synthesis';

export class ClaudeAIProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async synthesizeRestaurantProposals(input: SynthesisInput): Promise<SynthesisOutput> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
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

    if (!Array.isArray(parsed.proposals) || parsed.proposals.length !== 3) {
      throw new Error(`Claude did not return exactly 3 proposals (got ${parsed.proposals?.length ?? 0})`);
    }

    const validIds = new Set(input.candidates.map((c) => c.id));
    for (const proposal of parsed.proposals) {
      if (!validIds.has(proposal.candidate_id)) {
        throw new Error(`Claude returned unknown candidate_id: ${proposal.candidate_id}`);
      }
    }

    return parsed;
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
