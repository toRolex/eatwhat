import type { Event, Invitation, GuestPreferences, Proposal, Vote, FinalizedPlan, User } from './models';
import type { EventStatus } from './enums';

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface MagicLinkRequest {
  email: string;
}

export interface MeResponse {
  user: User;
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface CreateEventRequest {
  title: string;
  description?: string;
  template_id: string;
  location_hint?: string;
  date_flexible: boolean;
  proposed_date?: string;
  rsvp_deadline: string;
  cover_image_url?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  cover_image_url?: string;
  template_id?: string;
  location_hint?: string;
  date_flexible?: boolean;
  proposed_date?: string;
  rsvp_deadline?: string;
}

export interface EventResponse {
  event: Event;
}

export interface EventListResponse {
  events: Event[];
}

export interface TriggerEventRequest {
  // Optionally override the location used for venue search
  location_override?: string;
}

// ── Invitations ───────────────────────────────────────────────────────────────

export interface InviteGuestsRequest {
  guests: Array<{ name: string; email: string }>;
}

export interface InviteGuestsResponse {
  invitations: Invitation[];
}

export interface ResolveInviteResponse {
  invitation: Invitation;
  event: Pick<Event, 'id' | 'title' | 'description' | 'cover_image_url' | 'template_id' | 'proposed_date' | 'date_flexible' | 'rsvp_deadline' | 'status' | 'slug'>;
  host: Pick<User, 'name' | 'avatar_url'>;
}

export interface RSVPRequest {
  status: 'accepted' | 'declined';
  name?: string;
}

export interface RSVPResponse {
  invitation: Invitation;
}

// ── Preferences ───────────────────────────────────────────────────────────────

export interface SubmitPreferencesRequest {
  dietary: string[];
  cuisine_prefs: string[];
  cuisine_avoid: string[];
  budget_min?: number;
  budget_max?: number;
  location_pref?: string;
  availability?: Record<string, unknown>;
  vibe_pref?: string;
  notes?: string;
}

export interface PreferencesResponse {
  preferences: GuestPreferences;
}

export interface EventPreferencesResponse {
  preferences: GuestPreferences[];
  total_invited: number;
  total_responded: number;
}

// ── Proposals ────────────────────────────────────────────────────────────────

export interface ProposalsResponse {
  proposals: Proposal[];
}

export interface CastVoteRequest {
  rank: 1 | 2 | 3;
}

export interface VoteResponse {
  vote: Vote;
}

export interface ResultsResponse {
  proposals: Array<Proposal & { vote_count: number; weighted_score: number }>;
  winner: Proposal | null;
  total_voters: number;
}

// ── Finalization ──────────────────────────────────────────────────────────────

export interface FinalizeRequest {
  proposal_id: string;
  confirmed_time: string;
  notes?: string;
}

export interface FinalizeResponse {
  plan: FinalizedPlan;
}

// ── Errors ────────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
}

// ── Status transitions (used by PATCH /api/events/[id]) ──────────────────────

export interface TransitionEventRequest {
  status: EventStatus;
}
