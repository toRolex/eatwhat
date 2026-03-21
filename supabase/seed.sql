-- Seed data for local development
-- Run after migrations: supabase db reset

-- Note: auth.users rows must be created via Supabase Auth API or the dashboard.
-- These inserts assume you've created two users with the UUIDs below via `supabase auth signup`.

-- Example host user (replace UUID after creating via dashboard)
-- INSERT INTO users (id, name, email) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Alex Host', 'alex@example.com');

-- Example event
-- INSERT INTO events (id, host_id, title, description, rsvp_deadline, slug, status)
-- VALUES (
--   '00000000-0000-0000-0000-000000000010',
--   '00000000-0000-0000-0000-000000000001',
--   'Friday Night Dinner',
--   'Let''s catch up over dinner!',
--   NOW() + INTERVAL '7 days',
--   'friday-night-dinner',
--   'open'
-- );
