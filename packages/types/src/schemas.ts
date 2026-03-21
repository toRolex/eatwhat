import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────

export const MagicLinkSchema = z.object({
  email: z.string().email(),
});

// ── Events ────────────────────────────────────────────────────────────────────

export const CreateEventSchema = z.object({
  title:           z.string().min(1).max(120),
  description:     z.string().max(500).optional(),
  template_id:     z.enum(['classic', 'minimal', 'gradient']),
  location_hint:   z.string().max(200).optional(),
  date_flexible:   z.boolean(),
  proposed_date:   z.string().datetime().optional(),
  rsvp_deadline:   z.string().datetime(),
  cover_image_url: z.string().url().optional(),
});

export const UpdateEventSchema = CreateEventSchema.partial();

export const TransitionEventSchema = z.object({
  status: z.enum(['draft', 'open', 'collecting', 'deciding', 'finalized', 'cancelled']),
});

export const TriggerEventSchema = z.object({
  location_override: z.string().max(200).optional(),
});

// ── Invitations ───────────────────────────────────────────────────────────────

export const InviteGuestsSchema = z.object({
  guests: z.array(
    z.object({
      name:  z.string().min(1).max(100),
      email: z.string().email(),
    })
  ).min(1).max(50),
});

export const RSVPSchema = z.object({
  status: z.enum(['accepted', 'declined']),
  name:   z.string().min(1).max(100).optional(),
});

// ── Preferences ───────────────────────────────────────────────────────────────

const DollarAmount = z.number().int().min(0).max(100_000); // cents

export const SubmitPreferencesSchema = z.object({
  dietary:       z.array(z.string().max(50)).max(20),
  cuisine_prefs: z.array(z.string().max(50)).max(20),
  cuisine_avoid: z.array(z.string().max(50)).max(20),
  budget_min:    DollarAmount.optional(),
  budget_max:    DollarAmount.optional(),
  location_pref: z.string().max(200).optional(),
  availability:  z.record(z.unknown()).optional(),
  vibe_pref:     z.string().max(100).optional(),
  notes:         z.string().max(500).optional(),
}).refine(
  (d) => d.budget_min == null || d.budget_max == null || d.budget_min <= d.budget_max,
  { message: 'budget_min must be ≤ budget_max', path: ['budget_min'] }
);

// ── Votes ─────────────────────────────────────────────────────────────────────

export const CastVoteSchema = z.object({
  rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

// ── Finalization ──────────────────────────────────────────────────────────────

export const FinalizeSchema = z.object({
  proposal_id:    z.string().uuid(),
  confirmed_time: z.string().datetime(),
  notes:          z.string().max(500).optional(),
});

// ── Inferred types (useful when consuming schemas in API routes) ──────────────

export type CreateEventInput     = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput     = z.infer<typeof UpdateEventSchema>;
export type InviteGuestsInput    = z.infer<typeof InviteGuestsSchema>;
export type RSVPInput             = z.infer<typeof RSVPSchema>;
export type SubmitPreferencesInput = z.infer<typeof SubmitPreferencesSchema>;
export type CastVoteInput         = z.infer<typeof CastVoteSchema>;
export type FinalizeInput         = z.infer<typeof FinalizeSchema>;
