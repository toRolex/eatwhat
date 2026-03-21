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
