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
