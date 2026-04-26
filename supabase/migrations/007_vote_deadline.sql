-- Vote deadline. Optional — if NULL, voting stays open until the host finalizes manually.
ALTER TABLE events ADD COLUMN vote_deadline TIMESTAMPTZ;
