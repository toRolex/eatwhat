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
