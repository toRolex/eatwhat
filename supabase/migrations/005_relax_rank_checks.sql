-- Allow more than 3 proposals per event (default 5, max 10).
-- Voting still ranks all proposals so the constraint must mirror.
ALTER TABLE proposals DROP CONSTRAINT proposals_rank_check;
ALTER TABLE proposals ADD  CONSTRAINT proposals_rank_check CHECK (rank BETWEEN 1 AND 10);

ALTER TABLE votes DROP CONSTRAINT votes_rank_check;
ALTER TABLE votes ADD  CONSTRAINT votes_rank_check CHECK (rank BETWEEN 1 AND 10);
