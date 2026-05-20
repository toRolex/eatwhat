import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../database.types';

export type UsageKind = 'ai_synthesis' | 'venue_search' | 'photo_proxy';

export interface InsertUsageRow {
  event_id?:      string | null;
  kind:           UsageKind;
  provider:       string;
  model?:         string;
  input_tokens?:  number;
  output_tokens?: number;
  cost_micros:    number;
  request_count?: number;
  metadata?:      Json;
}

export async function logUsage(db: SupabaseClient<Database>, row: InsertUsageRow) {
  return db.from('usage_log').insert({
    event_id:      row.event_id ?? null,
    kind:          row.kind,
    provider:      row.provider,
    model:         row.model ?? null,
    input_tokens:  row.input_tokens ?? null,
    output_tokens: row.output_tokens ?? null,
    cost_micros:   row.cost_micros,
    request_count: row.request_count ?? 1,
    metadata:      row.metadata ?? {},
  });
}

export async function getUsageByEvent(db: SupabaseClient<Database>, eventId: string) {
  return db
    .from('usage_log')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
}
