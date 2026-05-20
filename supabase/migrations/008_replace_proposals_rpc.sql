-- Atomically replaces all proposals for an event and advances its status to
-- 'deciding'. Runs inside a single implicit transaction so a failed insert
-- cannot leave the event with zero proposals.
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
    reasoning, constraints_met, constraints_gap, suggested_time
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
    (r->>'suggested_time')::timestamptz
  FROM jsonb_array_elements(p_rows) AS r;

  UPDATE events SET status = 'deciding' WHERE id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION replace_proposals_and_advance(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION replace_proposals_and_advance(UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION replace_proposals_and_advance(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION replace_proposals_and_advance(UUID, JSONB) TO service_role;
