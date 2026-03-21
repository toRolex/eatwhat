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
}

export interface ProposalOutput {
  rank: 1 | 2 | 3;
  candidate_id: string;
  reasoning: string;
  constraints_met: Record<string, boolean>;
  constraints_gap: Record<string, string>;
  suggested_time?: string;
}

export interface SynthesisOutput {
  proposals: [ProposalOutput, ProposalOutput, ProposalOutput];
}

// Implement this interface to swap Claude for any other model
export interface AIProvider {
  synthesizeRestaurantProposals(input: SynthesisInput): Promise<SynthesisOutput>;
}
