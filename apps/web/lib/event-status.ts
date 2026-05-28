// Shared display constants for event status — used by host event page and
// the public /e/[slug] status page.

export const STATUS_COLORS: Record<string, string> = {
  open:       'oklch(44% 0.14 228)',
  collecting: 'oklch(44% 0.15 148)',
  deciding:   'oklch(46% 0.15 72)',
  finalized:  'oklch(44% 0.14 228)',
  cancelled:  'oklch(44% 0.18 26)',
};

export const STATUS_LABELS: Record<string, string> = {
  draft:      'Draft',
  open:       'Open for RSVPs',
  collecting: 'Collecting RSVPs',
  deciding:   'Voting in progress',
  finalized:  'Finalized',
  cancelled:  'Cancelled',
};
