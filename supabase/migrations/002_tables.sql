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
