import type { EventStatus, EventCategory, InviteStatus } from './enums';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  cover_image_url: string | null;
  template_id: string;
  location_hint: string | null;
  date_flexible: boolean;
  proposed_date: string | null;
  rsvp_deadline: string;
  vote_deadline: string | null;
  status: EventStatus;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  event_id: string;
  user_id: string | null;
  invite_token: string;
  slug: string;
  name: string;
  email: string;
  status: InviteStatus;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestPreferences {
  id: string;
  invitation_id: string;
  event_id: string;
  dietary: string[];
  cuisine_prefs: string[];
  cuisine_avoid: string[];
  budget_min: number | null;
  budget_max: number | null;
  location_pref: string | null;
  availability: unknown;
  vibe_pref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  event_id: string;
  rank: number;
  restaurant_name: string;
  restaurant_addr: string;
  cuisine_type: string;
  price_range: string;
  rating: number | null;
  image_url: string | null;
  maps_url: string | null;
  booking_url: string | null;
  reasoning: string;
  constraints_met: unknown;
  constraints_gap: unknown;
  suggested_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  proposal_id: string;
  invitation_id: string;
  rank: 1 | 2 | 3;
  created_at: string;
  updated_at: string;
}

export interface FinalizedPlan {
  id: string;
  event_id: string;
  proposal_id: string;
  confirmed_time: string;
  notes: string | null;
  calendar_data: CalendarData;
  created_at: string;
  updated_at: string;
}

// Provider-agnostic calendar payload; .ics and GCal API are both derived from this
export interface CalendarData {
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  attendees: Array<{ name: string; email: string }>;
}
