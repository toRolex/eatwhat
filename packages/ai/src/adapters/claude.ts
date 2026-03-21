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
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: buildSynthesisPrompt(input),
        },
      ],
    });

    const block = response.content[0];
    if (!block || block.type !== 'text') {
      throw new Error('Unexpected response shape from Claude');
    }

    let parsed: SynthesisOutput;
    try {
      parsed = JSON.parse(block.text) as SynthesisOutput;
    } catch {
      throw new Error(`Claude returned non-JSON output: ${block.text.slice(0, 200)}`);
    }

    if (!Array.isArray(parsed.proposals) || parsed.proposals.length !== 3) {
      throw new Error('Claude did not return exactly 3 proposals');
    }

    // Verify all candidate IDs exist in the input to catch hallucinations early
    const validIds = new Set(input.candidates.map((c) => c.id));
    for (const proposal of parsed.proposals) {
      if (!validIds.has(proposal.candidate_id)) {
        throw new Error(`Claude returned unknown candidate_id: ${proposal.candidate_id}`);
      }
    }

    return parsed;
  }
}
