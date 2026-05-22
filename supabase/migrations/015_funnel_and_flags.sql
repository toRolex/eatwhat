CREATE TABLE funnel_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  session_id  TEXT,
  event_name  TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_funnel_events_name_created ON funnel_events (event_name, created_at DESC);
CREATE INDEX idx_funnel_events_user        ON funnel_events (user_id, created_at DESC);

CREATE TABLE feature_flags (
  flag_name  TEXT      PRIMARY KEY,
  enabled    BOOLEAN   NOT NULL DEFAULT FALSE,
  user_ids   UUID[]    NOT NULL DEFAULT '{}'
);
