export const EventStatus = {
  DRAFT:      'draft',
  OPEN:       'open',
  COLLECTING: 'collecting',
  DECIDING:   'deciding',
  FINALIZED:  'finalized',
  CANCELLED:  'cancelled',
} as const;
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const EventCategory = {
  DINNER: 'dinner',
} as const;
export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory];

export const InviteStatus = {
  PENDING:  'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
} as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];

// Valid transitions from a given status; enforced at the API layer
export const EVENT_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft:      ['open', 'cancelled'],
  open:       ['collecting', 'cancelled'],
  collecting: ['deciding', 'cancelled'],
  deciding:   ['finalized', 'cancelled'],
  finalized:  [],
  cancelled:  [],
};
