// Uses Gemini function calling (not googleSearch grounding) to produce restaurant candidates.
// All candidates are source: 'inferred' — this uses model knowledge, not live Maps data.
// Real Maps grounding will replace this in a future session once the google_maps tool
// is available in the Gemini REST API.
import { PipelineError, StructuredConstraint, EnrichedCandidate } from '../pipeline/types';
import { safeLogStage } from '../utils/logger';
import { withRetry } from '../utils/retry';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const SUBMIT_CANDIDATES_TOOL = {
  name: 'submit_restaurant_candidates',
  description: 'Submit restaurant candidates matching the group location and constraints.',
  parameters: {
    type: 'object',
    properties: {
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            place_id: { type: 'string', description: 'A unique stable ID for this restaurant' },
            name: { type: 'string' },
            address: { type: 'string' },
            cuisine_types: { type: 'array', items: { type: 'string' } },
            price_range: { type: 'string', description: 'One of: $, $$, $$$, $$$$' },
            rating: { type: 'number', description: '0.0 to 5.0' },
            review_count: { type: 'integer' },
            review_summary: { type: 'string', description: '2-3 sentence summary' },
          },
          required: ['place_id', 'name', 'address', 'cuisine_types', 'price_range', 'rating', 'review_count', 'review_summary'],
        },
        minItems: 1,
        maxItems: 20,
      },
    },
    required: ['candidates'],
  },
};

function buildSystemPrompt(locationHint: string, constraints: StructuredConstraint[]): string {
  const hardDietary = [...new Set(constraints.flatMap(c => c.dietary_hard))];
  const softDietary = [...new Set(constraints.flatMap(c => c.dietary_soft))];
  const guestSummaries = constraints.map((c, i) =>
    'guest_' + i + ': hard_dietary=[' + c.dietary_hard.join(', ') + '], soft_dietary=[' + c.dietary_soft.join(', ') + '], cuisine_avoids=[' + c.cuisine_avoids.join(', ') + ']'
  );

  return [
    'You are a restaurant discovery assistant for a group dining event.',
    'Location: ' + locationHint,
    'Group hard dietary requirements (ALL must be satisfied): ' + (hardDietary.join(', ') || 'none'),
    'Group soft dietary preferences: ' + (softDietary.join(', ') || 'none'),
    'Guest breakdown (anonymized):',
    ...guestSummaries,
    '',
    'Return 10-15 real restaurants in this area that best match these constraints.',
    'For each restaurant provide an honest review_summary of 2-3 sentences covering dietary options, ambiance, and notable features.',
    'You MUST call the submit_restaurant_candidates function with your results.',
  ].join('\n');
}

type RawCandidate = {
  place_id: string;
  name: string;
  address: string;
  cuisine_types: string[];
  price_range: string;
  rating: number;
  review_count: number;
  review_summary: string;
};

type GeminiResponseBody = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        functionCall?: {
          name: string;
          args: { candidates?: RawCandidate[] };
        };
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
};

export async function geminiMapsGrounding(
  locationHint: string,
  constraints: StructuredConstraint[],
): Promise<EnrichedCandidate[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new PipelineError('gemini-maps-grounding', new Error('GEMINI_API_KEY environment variable is not set'));
  }

  const model = process.env.GEMINI_MODEL;
  if (!model) {
    throw new PipelineError('gemini-maps-grounding', new Error('GEMINI_MODEL environment variable is not set'));
  }

  const systemPrompt = buildSystemPrompt(locationHint, constraints);
  const userPrompt = 'Find 10-15 restaurants near ' + locationHint + ' that accommodate the group constraints described above.';

  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    tools: [{ functionDeclarations: [SUBMIT_CANDIDATES_TOOL] }],
    toolConfig: {
      functionCallingConfig: {
        mode: 'ANY',
        allowedFunctionNames: ['submit_restaurant_candidates'],
      },
    },
  };

  const startMs = Date.now();

  let responseBody: GeminiResponseBody;

  try {
    responseBody = await withRetry(
      async () => {
        const res = await fetch(
          GEMINI_ENDPOINT + '/' + model + ':generateContent?key=' + apiKey,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );

        if (!res.ok) {
          const errText = await res.text().catch(() => res.statusText);
          const err = Object.assign(
            new Error('Gemini API error ' + res.status + ': ' + errText),
            { status: res.status }
          );
          throw err;
        }

        return res.json() as Promise<GeminiResponseBody>;
      },
      2,
      1000
    );
  } catch (err) {
    throw new PipelineError(
      'gemini-maps-grounding',
      err instanceof Error ? err : new Error(String(err))
    );
  }

  const latencyMs = Date.now() - startMs;

  const firstCandidate = responseBody.candidates?.[0];
  const parts = firstCandidate?.content?.parts ?? [];
  const funcCallPart = parts.find(p => p.functionCall?.name === 'submit_restaurant_candidates');

  if (!funcCallPart?.functionCall) {
    throw new PipelineError(
      'gemini-maps-grounding',
      new Error('Gemini response contained no functionCall block for submit_restaurant_candidates')
    );
  }

  const rawCandidates = funcCallPart.functionCall.args.candidates;
  if (!rawCandidates || rawCandidates.length === 0) {
    throw new PipelineError(
      'gemini-maps-grounding',
      new Error('Gemini returned an empty candidates array')
    );
  }

  const enrichedCandidates: EnrichedCandidate[] = rawCandidates.map(c => ({
    ...c,
    dietary_analysis: {},
    enrichment_tier: 1 as const,
  }));

  safeLogStage({
    eventId: constraints[0]?.event_id ?? 'batch',
    stage: 'gemini-maps-grounding',
    provider: 'gemini',
    model,
    inputTokens: responseBody.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: responseBody.usageMetadata?.candidatesTokenCount ?? 0,
    latencyMs,
    rawInput: { locationHint, constraintCount: constraints.length },
    rawOutput: { candidateCount: enrichedCandidates.length },
  });

  return enrichedCandidates;
}

export const geminiAdapter = { run: geminiMapsGrounding };
