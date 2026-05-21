-- Update replace_proposals_and_advance to include v2 columns added in migration 009.
-- Prior to this migration the v2 columns were silently dropped at DB write.
CREATE OR REPLACE FUNCTION replace_proposals_and_advance(
  p_event_id  UUID,
  p_rows      JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM proposals WHERE event_id = p_event_id;

  INSERT INTO proposals (
    event_id, rank, restaurant_name, restaurant_addr, cuisine_type,
    price_range, rating, image_url, maps_url, booking_url,
    reasoning, constraints_met, constraints_gap, suggested_time,
    envy_scores, narrative_group, narrative_personal, confidence_score
  )
  SELECT
    p_event_id,
    (r->>'rank')::integer,
    r->>'restaurant_name',
    r->>'restaurant_addr',
    r->>'cuisine_type',
    r->>'price_range',
    (r->>'rating')::float,
    r->>'image_url',
    r->>'maps_url',
    r->>'booking_url',
    r->>'reasoning',
    (r->'constraints_met'),
    (r->'constraints_gap'),
    CASE WHEN r->>'suggested_time' IS NULL THEN NULL
         ELSE (r->>'suggested_time')::timestamptz END,
    (r->'envy_scores'),
    (r->>'narrative_group'),
    (r->'narrative_personal'),
    (r->>'confidence_score')::float
  FROM jsonb_array_elements(p_rows) AS r;

  UPDATE events SET status = 'deciding' WHERE id = p_event_id;
END;
$$;

-- Permissions are inherited from migration 008 via CREATE OR REPLACE.
-- Re-apply grants defensively in case the function was dropped and recreated.
REVOKE ALL ON FUNCTION replace_proposals_and_advance(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION replace_proposals_and_advance(UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION replace_proposals_and_advance(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION replace_proposals_and_advance(UUID, JSONB) TO service_role;

-- RLS is enabled on these tables (migration 009) with no user-facing policies.
-- deny-by-default for all non-service-role clients.
-- service_role bypasses RLS automatically in Supabase.
COMMENT ON TABLE ai_logs IS 'Pipeline observability. RLS: deny-by-default (no user-facing policies). Service role only.';
COMMENT ON TABLE structured_constraints IS 'Per-guest constraint analysis. RLS: deny-by-default. Service role only.';
COMMENT ON TABLE restaurant_cache IS 'Restaurant embedding + dietary analysis cache. RLS: deny-by-default. Service role only.';
