-- enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ai_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage         TEXT NOT NULL,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  input_hash    TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  latency_ms    INTEGER,
  cost_micros   INTEGER,
  raw_input     JSONB,
  raw_output    JSONB,
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_logs_event ON ai_logs(event_id);
CREATE INDEX idx_ai_logs_stage ON ai_logs(stage);

CREATE TABLE structured_constraints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id   UUID NOT NULL UNIQUE REFERENCES invitations(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  dietary_hard    TEXT[] DEFAULT '{}',
  dietary_soft    TEXT[] DEFAULT '{}',
  cuisine_likes   JSONB DEFAULT '{}',
  cuisine_avoids  TEXT[] DEFAULT '{}',
  budget_min      INTEGER,
  budget_max      INTEGER,
  vibe_tags       TEXT[] DEFAULT '{}',
  dealbreaker_flags TEXT[] DEFAULT '{}',
  intensity_tier  TEXT DEFAULT 'soft',
  raw_text        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_constraints_event ON structured_constraints(event_id);

CREATE TABLE restaurant_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id        TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  dietary_analysis JSONB,
  vibe_embedding  VECTOR(1024),
  review_summary  TEXT,
  menu_analysis   JSONB,
  last_analyzed   TIMESTAMPTZ DEFAULT now(),
  ttl_days        INTEGER DEFAULT 30
);
CREATE INDEX idx_rcache_place ON restaurant_cache(place_id);

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS envy_scores JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS constraint_coverage JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS narrative_group TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS narrative_personal JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE structured_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_cache ENABLE ROW LEVEL SECURITY;
