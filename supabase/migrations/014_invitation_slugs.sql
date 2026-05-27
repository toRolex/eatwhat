ALTER TYPE invite_status ADD VALUE IF NOT EXISTS 'pending_signup';

ALTER TABLE invitations
  ADD COLUMN slug TEXT;

UPDATE invitations AS i
SET slug = e.slug || '-' || substr(i.invite_token, 1, 8)
FROM events AS e
WHERE i.event_id = e.id
  AND i.slug IS NULL;

ALTER TABLE invitations
  ALTER COLUMN slug SET DEFAULT encode(extensions.gen_random_bytes(4), 'hex'),
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT invitations_slug_key UNIQUE (slug);
