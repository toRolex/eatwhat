// Shared display constants for event status — used by host event page and
// the public /e/[slug] status page.

export const STATUS_COLORS: Record<string, string> = {
  open:       'var(--sky)',
  collecting: 'oklch(60% 0.15 148)',
  deciding:   'oklch(68% 0.15 72)',
  finalized:  'oklch(58% 0.14 228)',
  cancelled:  'oklch(58% 0.18 26)',
};

export const STATUS_LABELS: Record<string, string> = {
  draft:      'Draft',
  open:       'Open for RSVPs',
  collecting: 'Collecting RSVPs',
  deciding:   'Voting in progress',
  finalized:  'Finalized',
  cancelled:  'Cancelled',
};
