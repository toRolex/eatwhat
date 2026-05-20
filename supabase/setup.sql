-- Full schema for fresh installs. Kept in sync with supabase/migrations/.
-- For upgrades on an existing database, apply only the migration files you
-- haven't run yet (in numerical order) rather than re-running this file.

-- Event lifecycle state machine: draft → open → collecting → deciding → finalized
CREATE TYPE event_status AS ENUM (
  'draft',
  'open',
  'collecting',
  'deciding',
  'finalized',
  'cancelled'
);

-- v1 only supports dinner; extend this enum when adding trip/party/activity categories
CREATE TYPE event_category AS ENUM ('dinner');

CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined');
-- Mirror of auth.users — stores profile data beyond what Supabase auth provides
CREATE TABLE users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id          UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT           NOT NULL,
  description      TEXT,
  category         event_category NOT NULL DEFAULT 'dinner',
  cover_image_url  TEXT,
  template_id      TEXT           NOT NULL DEFAULT 'classic',
  location_hint    TEXT,
  date_flexible    BOOLEAN        NOT NULL DEFAULT TRUE,
  proposed_date    TIMESTAMPTZ,
  rsvp_deadline    TIMESTAMPTZ    NOT NULL,
  vote_deadline    TIMESTAMPTZ,
  status           event_status   NOT NULL DEFAULT 'draft',
  slug             TEXT           NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE invitations (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID          NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  -- null until the guest creates a host account; guests operate via invite_token
  user_id       UUID          REFERENCES users(id) ON DELETE SET NULL,
  invite_token  TEXT          NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  name          TEXT          NOT NULL,
  email         TEXT          NOT NULL,
  status        invite_status NOT NULL DEFAULT 'pending',
  responded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- v1 fields are dinner-specific; extend via new category-specific tables for future event types
-- budget stored in cents to avoid floating-point issues
CREATE TABLE guest_preferences (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id  UUID        NOT NULL UNIQUE REFERENCES invitations(id) ON DELETE CASCADE,
  event_id       UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  dietary        TEXT[]      NOT NULL DEFAULT '{}',
  cuisine_prefs  TEXT[]      NOT NULL DEFAULT '{}',
  cuisine_avoid  TEXT[]      NOT NULL DEFAULT '{}',
  budget_min     INTEGER,
  budget_max     INTEGER,
  location_pref  TEXT,
  -- free-form slot availability for flexible-date events
  availability   JSONB,
  vibe_pref      TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Populated exclusively by the AI synthesis job via service role; never inserted by guests
CREATE TABLE proposals (
  id               UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID      NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rank             INTEGER   NOT NULL CHECK (rank BETWEEN 1 AND 3),
  restaurant_name  TEXT      NOT NULL,
  restaurant_addr  TEXT      NOT NULL,
  cuisine_type     TEXT      NOT NULL,
  price_range      TEXT      NOT NULL,
  rating           FLOAT,
  image_url        TEXT,
  maps_url         TEXT,
  -- placeholder for future direct booking API integration
  booking_url      TEXT,
  reasoning        TEXT      NOT NULL,
  constraints_met  JSONB     NOT NULL DEFAULT '{}',
  constraints_gap  JSONB     NOT NULL DEFAULT '{}',
  suggested_time   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, rank)
);

-- rank = 1 means top choice; UNIQUE prevents a guest voting twice on the same proposal
CREATE TABLE votes (
  id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id    UUID      NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  invitation_id  UUID      NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  rank           INTEGER   NOT NULL CHECK (rank BETWEEN 1 AND 3),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(proposal_id, invitation_id)
);

-- calendar_data stores provider-agnostic event data; .ics is derived from it, not hardcoded
CREATE TABLE finalized_plans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  proposal_id     UUID        NOT NULL REFERENCES proposals(id),
  confirmed_time  TIMESTAMPTZ NOT NULL,
  notes           TEXT,
  calendar_data   JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Propagate updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at            BEFORE UPDATE ON users            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at           BEFORE UPDATE ON events           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER invitations_updated_at      BEFORE UPDATE ON invitations      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER guest_preferences_updated_at BEFORE UPDATE ON guest_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER proposals_updated_at        BEFORE UPDATE ON proposals        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER votes_updated_at            BEFORE UPDATE ON votes            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER finalized_plans_updated_at  BEFORE UPDATE ON finalized_plans  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create users row when a new auth.users entry is inserted
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE finalized_plans   ENABLE ROW LEVEL SECURITY;

-- Helper: returns true if the calling user hosts the given event
CREATE OR REPLACE FUNCTION is_event_host(p_event_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND host_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: returns true if the calling user has an accepted invitation to the event
CREATE OR REPLACE FUNCTION is_event_guest(p_event_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM invitations
    WHERE event_id = p_event_id
      AND user_id = auth.uid()
      AND status = 'accepted'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── users ────────────────────────────────────────────────────────────────────
-- Any authenticated user can read public profile fields; only the owner updates
CREATE POLICY "users_select_any"  ON users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "users_update_own"  ON users FOR UPDATE USING (id = auth.uid());
-- INSERT is handled by the auth trigger (SECURITY DEFINER), so no policy needed

-- ── events ───────────────────────────────────────────────────────────────────
CREATE POLICY "events_select_host"  ON events FOR SELECT USING (host_id = auth.uid());
CREATE POLICY "events_select_guest" ON events FOR SELECT USING (is_event_guest(id));
CREATE POLICY "events_insert_auth"  ON events FOR INSERT WITH CHECK (host_id = auth.uid());
CREATE POLICY "events_update_host"  ON events FOR UPDATE USING (host_id = auth.uid());
CREATE POLICY "events_delete_host"  ON events FOR DELETE USING (host_id = auth.uid());

-- ── invitations ──────────────────────────────────────────────────────────────
-- Hosts see all invites for their events; guests see their own
CREATE POLICY "invitations_select_host"  ON invitations FOR SELECT USING (is_event_host(event_id));
CREATE POLICY "invitations_select_own"   ON invitations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "invitations_insert_host"  ON invitations FOR INSERT WITH CHECK (is_event_host(event_id));
-- Guests update their own RSVP status; hosts can update any invitation
CREATE POLICY "invitations_update_host"  ON invitations FOR UPDATE USING (is_event_host(event_id));
CREATE POLICY "invitations_update_own"   ON invitations FOR UPDATE USING (user_id = auth.uid());

-- ── guest_preferences ────────────────────────────────────────────────────────
-- Hosts read all preferences for their events; guests manage their own
CREATE POLICY "prefs_select_host"  ON guest_preferences FOR SELECT USING (is_event_host(event_id));
CREATE POLICY "prefs_select_own"   ON guest_preferences FOR SELECT
  USING (invitation_id IN (SELECT id FROM invitations WHERE user_id = auth.uid()));
CREATE POLICY "prefs_insert_own"   ON guest_preferences FOR INSERT
  WITH CHECK (invitation_id IN (SELECT id FROM invitations WHERE user_id = auth.uid()));
CREATE POLICY "prefs_update_own"   ON guest_preferences FOR UPDATE
  USING (invitation_id IN (SELECT id FROM invitations WHERE user_id = auth.uid()));

-- ── proposals ────────────────────────────────────────────────────────────────
-- Proposals are inserted only by API routes using the service role key
CREATE POLICY "proposals_select_host"  ON proposals FOR SELECT USING (is_event_host(event_id));
CREATE POLICY "proposals_select_guest" ON proposals FOR SELECT USING (is_event_guest(event_id));

-- ── votes ────────────────────────────────────────────────────────────────────
CREATE POLICY "votes_select_host"  ON votes FOR SELECT
  USING (is_event_host((SELECT event_id FROM proposals WHERE id = proposal_id)));
CREATE POLICY "votes_select_guest" ON votes FOR SELECT
  USING (invitation_id IN (SELECT id FROM invitations WHERE user_id = auth.uid()));
CREATE POLICY "votes_insert_own"   ON votes FOR INSERT
  WITH CHECK (invitation_id IN (SELECT id FROM invitations WHERE user_id = auth.uid()));
CREATE POLICY "votes_update_own"   ON votes FOR UPDATE
  USING (invitation_id IN (SELECT id FROM invitations WHERE user_id = auth.uid()));

-- ── finalized_plans ──────────────────────────────────────────────────────────
CREATE POLICY "finalized_select_host"  ON finalized_plans FOR SELECT USING (is_event_host(event_id));
CREATE POLICY "finalized_select_guest" ON finalized_plans FOR SELECT USING (is_event_guest(event_id));
CREATE POLICY "finalized_insert_host"  ON finalized_plans FOR INSERT WITH CHECK (is_event_host(event_id));
CREATE POLICY "finalized_update_host"  ON finalized_plans FOR UPDATE USING (is_event_host(event_id));
-- Public event status page resolves by slug on every load
CREATE INDEX idx_events_slug    ON events(slug);
CREATE INDEX idx_events_host_id ON events(host_id);
CREATE INDEX idx_events_status  ON events(status);

-- Token resolution is on every guest page load
CREATE INDEX idx_invitations_invite_token ON invitations(invite_token);
CREATE INDEX idx_invitations_event_id     ON invitations(event_id);
CREATE INDEX idx_invitations_user_id      ON invitations(user_id);
-- Realtime RSVP status aggregation queries this per-event
CREATE INDEX idx_invitations_event_status ON invitations(event_id, status);

CREATE INDEX idx_guest_preferences_event_id      ON guest_preferences(event_id);
CREATE INDEX idx_guest_preferences_invitation_id ON guest_preferences(invitation_id);

CREATE INDEX idx_proposals_event_id ON proposals(event_id);
CREATE INDEX idx_proposals_rank     ON proposals(event_id, rank);

CREATE INDEX idx_votes_invitation_id ON votes(invitation_id);
CREATE INDEX idx_votes_proposal_id   ON votes(proposal_id);

CREATE INDEX idx_finalized_plans_event_id ON finalized_plans(event_id);
-- Allow more than 3 proposals per event (default 5, max 10).
-- Voting still ranks all proposals so the constraint must mirror.
ALTER TABLE proposals DROP CONSTRAINT proposals_rank_check;
ALTER TABLE proposals ADD  CONSTRAINT proposals_rank_check CHECK (rank BETWEEN 1 AND 10);

ALTER TABLE votes DROP CONSTRAINT votes_rank_check;
ALTER TABLE votes ADD  CONSTRAINT votes_rank_check CHECK (rank BETWEEN 1 AND 10);
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

-- ── 008: Atomic proposal replacement RPC ─────────────────────────────────────
-- Replaces all proposals for an event and advances its status to 'deciding'
-- inside a single transaction. Prevents partial-delete state if the insert fails.
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
