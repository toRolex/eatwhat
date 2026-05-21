export interface PipelineResult {
  eventId: string;
  proposals: ProposalWithNarrative[];
  groupSummary: string;
  conflictsResolved: string[];
  totalLatencyMs: number;
  totalCostMicros: number;
  candidateDetails: Record<string, CandidateDetail>;
}

export interface PipelineStage<TInput, TOutput> {
  run(input: TInput): Promise<TOutput>;
}

export interface ImplicitContext {
  event_type_hint: 'work' | 'social' | 'date' | 'celebration' | 'general';
  meal_type: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'late_night';
  formality_bias: number;
  group_size_class: 'intimate' | 'small' | 'medium' | 'large';
}

export interface StructuredConstraint {
  guest_id: string;
  invitation_id: string;
  event_id: string;
  dietary_hard: string[];
  dietary_soft: string[];
  cuisine_likes: Record<string, number>;
  cuisine_avoids: string[];
  budget_min: number;
  budget_max: number;
  vibe_tags: string[];
  dealbreaker_flags: string[];
  intensity_tier: 'hard' | 'strong' | 'soft' | 'inferred';
  weight_multiplier: number;
  raw_text: string;
  items?: ConstraintItem[];
}

export interface RestaurantScore {
  place_id: string;
  name: string;
  review_summary: string;
  dietary_score: number;
  budget_score: number;
  cuisine_score: number;
  location_score: number;
  review_score: number;
  composite: number;
  vibeMatchScore: number;
  disqualified: boolean;
  disqualify_reason?: string;
  enrichedDescription: string;
  dietaryAnalysis: Record<string, number>;
  priceLevel: number;
  confidence: number;
  penalties: string[];
  bonuses: string[];
  constraintMatchSummary: string;
  envy_scores?: Record<string, number>;
  fairness_warnings?: string[];
}

export interface EnvyScore {
  restaurant_id: string;
  envy_scores: Record<string, number>;
  warnings: string[];
}

export interface ProposalWithNarrative {
  place_id: string;
  rank: 1 | 2 | 3;
  reasoning: string;
  constraints_met: string[];
  constraints_gap: string[];
  fairness_note: string;
  envy_scores: Record<string, number>;
  constraint_coverage: Record<string, boolean>;
  narrative_group: string;
  narrative_personal: Record<string, string>;
  confidence_score: number;
}

export class PipelineError extends Error {
  constructor(
    public stage: string,
    public originalError: Error
  ) {
    super(`Pipeline failed at stage: ${stage}`);
  }
}

export type ConstraintStrength = 'hard' | 'soft' | 'inferred' | 'unknown';

export interface ConstraintItem {
  id: string;
  category:
    | 'dietary'
    | 'allergy'
    | 'budget'
    | 'location'
    | 'time'
    | 'cuisine'
    | 'accessibility'
    | 'ambiance'
    | 'service_speed'
    | 'other';
  strength: ConstraintStrength;
  value: string;
  sourceText?: string;
  confidence: number;
  reason?: string;
}

export interface ImplicitInferenceResult {
  context: ImplicitContext;
  inferred: ConstraintItem[];
}

export type DataSource = 'grounded' | 'inferred' | 'unknown';

export interface DietarySignal {
  source: DataSource;
  confidence: number;
  evidence?: string;
}

export type DietaryAnalysis = Record<string, DietarySignal>;

export interface EnrichedCandidate {
  place_id: string;
  name: string;
  address: string;
  cuisine_types: string[];
  price_range: string;
  rating: number;
  review_count: number;
  review_summary: string;
  dietary_analysis: DietaryAnalysis;
  enrichment_tier: 1 | 2 | 3;
  image_url?: string;
  maps_url?: string;
}

export interface CandidateDetail {
  name: string;
  address: string;
  cuisine_types: string[];
  price_range: string;
  rating: number;
  review_summary: string;
  image_url?: string;
  maps_url?: string;
}
