import { RestaurantScore, StructuredConstraint, PipelineError } from '../pipeline/types';
import { getCachedRestaurant, setCachedRestaurant } from '../utils/cache';
import { withRetry } from '../utils/retry';
import { safeLogStage } from '../utils/logger';

type VoyageEmbeddingResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  usage?: { total_tokens?: number };
};

function buildVibeQuery(constraints: StructuredConstraint[]): string {
  const vibeTags = [...new Set(constraints.flatMap(c => c.vibe_tags))];
  const cuisineLikes = [...new Set(constraints.flatMap(c => Object.keys(c.cuisine_likes)))];
  const parts: string[] = [];
  if (vibeTags.length) parts.push('Vibe preferences: ' + vibeTags.join(', '));
  if (cuisineLikes.length) parts.push('Cuisine preferences: ' + cuisineLikes.join(', '));
  return parts.join('. ') || 'restaurant dining';
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const dot = a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (normA === 0 || normB === 0) return 0;
  return Math.max(0, Math.min(1, dot / (normA * normB)));
}

async function fetchEmbeddings(
  inputs: string[],
  inputType: 'document' | 'query',
  apiKey: string,
  model: string,
): Promise<VoyageEmbeddingResponse> {
  return withRetry(
    async () => {
      const res = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: inputs, model, input_type: inputType }),
      });
      if (!res.ok) {
        const err = new Error('Voyage API error: ' + res.status) as Error & { status: number };
        err.status = res.status;
        throw err;
      }
      return res.json() as Promise<VoyageEmbeddingResponse>;
    },
    2,
    1000,
  );
}

export async function run(
  candidates: RestaurantScore[],
  constraints: StructuredConstraint[],
): Promise<RestaurantScore[]> {
  const startTime = Date.now();
  const apiKey = process.env.VOYAGE_API_KEY;
  const model = process.env.VOYAGE_MODEL;

  if (!apiKey) {
    throw new PipelineError('vibe-embedder', new Error('VOYAGE_API_KEY environment variable is not set'));
  }
  if (!model) {
    throw new PipelineError('vibe-embedder', new Error('VOYAGE_MODEL environment variable is not set'));
  }

  const results: RestaurantScore[] = [...candidates];
  const embeddingMap = new Map<string, number[]>();
  const needsEmbedding: Array<{ index: number; text: string; placeId: string }> = [];
  let cachedCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    if (!candidate.review_summary || candidate.review_summary.trim() === '') {
      results[i] = { ...candidate, vibeMatchScore: 0.3 };
      continue;
    }

    const cached = await getCachedRestaurant(candidate.place_id);
    if (cached?.vibe_embedding && cached.vibe_embedding.length > 0) {
      embeddingMap.set(candidate.place_id, cached.vibe_embedding);
      cachedCount++;
    } else {
      needsEmbedding.push({ index: i, text: candidate.review_summary, placeId: candidate.place_id });
    }
  }

  let totalTokens = 0;

  if (needsEmbedding.length > 0) {
    let docResponse: VoyageEmbeddingResponse;
    try {
      docResponse = await fetchEmbeddings(
        needsEmbedding.map(n => n.text),
        'document',
        apiKey,
        model,
      );
    } catch (err) {
      throw new PipelineError('vibe-embedder', err as Error);
    }

    totalTokens += docResponse.usage?.total_tokens ?? 0;

    for (const item of docResponse.data) {
      const source = needsEmbedding[item.index]!;
      embeddingMap.set(source.placeId, item.embedding);
      try {
        await setCachedRestaurant(source.placeId, { vibe_embedding: item.embedding });
      } catch {
        // Cache write failure must not fail the stage.
      }
    }
  }

  const hasEmbeddings = embeddingMap.size > 0;

  if (!hasEmbeddings) {
    for (let i = 0; i < results.length; i++) {
      const c = results[i]!;
      if (c.vibeMatchScore !== 0.3) {
        results[i] = { ...c, vibeMatchScore: 0.3 };
      }
    }
    safeLogStage({
      eventId: constraints[0]?.event_id ?? 'batch',
      stage: 'vibe-embedder',
      provider: 'voyage',
      model,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      rawInput: { candidateCount: candidates.length, cachedCount, apiCount: needsEmbedding.length },
      rawOutput: { scoredCount: results.length },
    });
    return results;
  }

  let queryResponse: VoyageEmbeddingResponse;
  try {
    queryResponse = await fetchEmbeddings([buildVibeQuery(constraints)], 'query', apiKey, model);
  } catch (err) {
    throw new PipelineError('vibe-embedder', err as Error);
  }
  totalTokens += queryResponse.usage?.total_tokens ?? 0;

  const queryEmbedding = queryResponse.data[0]?.embedding ?? [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    const embedding = embeddingMap.get(candidate.place_id);
    if (embedding) {
      results[i] = { ...candidate, vibeMatchScore: cosineSimilarity(embedding, queryEmbedding) };
    }
  }

  safeLogStage({
    eventId: constraints[0]?.event_id ?? 'batch',
    stage: 'vibe-embedder',
    provider: 'voyage',
    model,
    inputTokens: totalTokens,
    outputTokens: 0,
    latencyMs: Date.now() - startTime,
    rawInput: { candidateCount: candidates.length, cachedCount, apiCount: needsEmbedding.length },
    rawOutput: { scoredCount: results.length },
  });

  return results;
}

export const vibeEmbedder = { run };
