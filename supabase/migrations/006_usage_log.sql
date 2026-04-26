-- Per-event spend telemetry for AI synthesis and venue search.
-- Lets the host see what each "Run AI" actually cost without scraping logs.

CREATE TYPE usage_kind AS ENUM ('ai_synthesis', 'venue_search', 'photo_proxy');

CREATE TABLE usage_log (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID         REFERENCES events(id) ON DELETE CASCADE,
  kind            usage_kind   NOT NULL,
  provider        TEXT         NOT NULL,
  model           TEXT,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  -- Cost stored in tenths of a cent (1000 = $1.00) so we can represent fractions of a cent.
  cost_micros     INTEGER      NOT NULL DEFAULT 0,
  request_count   INTEGER      NOT NULL DEFAULT 1,
  metadata        JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX usage_log_event_idx     ON usage_log (event_id, created_at DESC);
CREATE INDEX usage_log_kind_idx      ON usage_log (kind, created_at DESC);

ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

-- Hosts can read their own event's usage; service role inserts
CREATE POLICY usage_log_select_host ON usage_log FOR SELECT
  USING (
    event_id IS NULL
    OR EXISTS (SELECT 1 FROM events WHERE events.id = usage_log.event_id AND events.host_id = auth.uid())
  );
