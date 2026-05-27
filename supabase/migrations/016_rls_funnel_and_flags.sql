-- Fix: migration 015 created funnel_events and feature_flags without RLS.
-- Both tables were fully public (anon + authenticated could read/write).

-- ── funnel_events ────────────────────────────────────────────────────────────
-- Internal analytics telemetry. Users have no reason to read their own rows.
-- Inserted server-side via service role; deny-by-default for all other clients.
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE funnel_events IS 'App telemetry. RLS: deny-by-default (no user-facing policies). Service role only.';

-- ── feature_flags ────────────────────────────────────────────────────────────
-- Authenticated clients must be able to read flags to gate features client-side.
-- All writes are service-role only (no INSERT/UPDATE/DELETE policies for users).
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_select_auth" ON feature_flags
  FOR SELECT USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE feature_flags IS 'Feature flag registry. RLS: authenticated users can SELECT; service role manages writes.';
