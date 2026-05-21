ALTER TABLE structured_constraints
  ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE structured_constraints
  ADD COLUMN IF NOT EXISTS weight_multiplier FLOAT DEFAULT 1.0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'structured_constraints_invitation_id_key'
  ) THEN
    ALTER TABLE structured_constraints
      ADD CONSTRAINT structured_constraints_invitation_id_key UNIQUE (invitation_id);
  END IF;
END $$;
