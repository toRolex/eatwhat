import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { computeCostMicros } from './cost-tracker';

interface LogStageParams {
  eventId: string;
  stage: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  rawInput: unknown;
  rawOutput: unknown;
  error?: string;
}

// Best-effort wrapper — logging must not break the pipeline.
export function safeLogStage(params: LogStageParams): void {
  void logStage(params).catch(() => undefined);
}

// Only include raw payloads when PIPELINE_LOG_LEVEL=debug to avoid storing PII at rest.
export async function logStage(params: LogStageParams): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const inputHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(params.rawInput))
    .digest('hex');

  const isDebug = process.env.PIPELINE_LOG_LEVEL === 'debug';

  const { error } = await supabase.from('ai_logs').insert({
    event_id: params.eventId,
    stage: params.stage,
    provider: params.provider,
    model: params.model,
    input_hash: inputHash,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    latency_ms: params.latencyMs,
    cost_micros: computeCostMicros(params.model, params.inputTokens, params.outputTokens),
    raw_input: isDebug ? params.rawInput : null,
    raw_output: isDebug ? params.rawOutput : null,
    error: params.error ?? null,
  });
  if (error) throw error;
}
