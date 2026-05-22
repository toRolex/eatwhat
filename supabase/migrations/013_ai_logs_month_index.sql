CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_logs_event_created
  ON ai_logs(event_id, created_at DESC);
