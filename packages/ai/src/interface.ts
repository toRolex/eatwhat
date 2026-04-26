import type { GuestPreferences } from '@groupplan/types';

export interface RestaurantCandidate {
  id: string;
  name: string;
  address: string;
  cuisine_types: string[];
  price_range: string;
  rating: number;
  review_count: number;
  image_url?: string;
  maps_url?: string;
  booking_url?: string;
}

export interface SynthesisInput {
  event: {
    title: string;
    location_hint?: string;
    proposed_date?: string;
  };
  preferences: GuestPreferences[];
  candidates: RestaurantCandidate[];
  // How many ranked proposals to return (3..10, default 5).
  count?: number;
}

export interface ProposalOutput {
  rank: number;
  candidate_id: string;
  reasoning: string;
  constraints_met: Record<string, boolean>;
  constraints_gap: Record<string, string>;
  suggested_time?: string;
}

export interface UsageStats {
  model:           string;
  input_tokens:    number;
  output_tokens:   number;
  // Cost in micro-dollars (1e6 = $1.00). Computed from published per-model rates.
  cost_micros:     number;
}

export interface SynthesisOutput {
  proposals: ProposalOutput[];
  usage?:    UsageStats;
}

// Implement this interface to swap Claude for any other model
export interface AIProvider {
  synthesizeRestaurantProposals(input: SynthesisInput): Promise<SynthesisOutput>;
}
