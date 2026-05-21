// review quarterly — provider prices change
const PRICING: Record<string, { input: number; output: number } | { perRequest: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'claude-sonnet-4-6':         { input: 3.00,  output: 15.00 },
  'gemini-3-flash':            { input: 0.075, output: 0.30  },
  'voyage-3':                  { input: 0.06,  output: 0     },
  'cohere-rerank-v3.5':        { perRequest: 0.002           },
};

// Returns cost in micros (1e6 = $1.00). Token counts are per-token (not per-MTok).
export function computeCostMicros(model: string, inputTokens: number, outputTokens: number): number {
  const rate = PRICING[model];
  if (!rate) return 0;
  if ('perRequest' in rate) return Math.round(rate.perRequest * 1_000_000);
  const mtok = 1_000_000;
  return Math.round(
    (inputTokens * rate.input / mtok + outputTokens * rate.output / mtok) * 1_000_000
  );
}
