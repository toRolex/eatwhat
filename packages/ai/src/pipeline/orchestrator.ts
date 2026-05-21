import { createClient } from '@supabase/supabase-js';
import { dealbreakerDetector } from '../stages/dealbreaker-detector';
import { implicitInference } from '../stages/implicit-inference';
import { constraintExtractor } from '../stages/constraint-extractor';
import { geminiMapsGrounding } from '../adapters/gemini';
import { menuPhantom } from '../stages/menu-phantom';
import { deterministicScorer } from '../stages/deterministic-scorer';
import { vibeEmbedder } from '../stages/vibe-embedder';
import { reranker } from '../stages/reranker';
import { fairnessChecker } from '../stages/fairness-checker';
import { reasoningEngine } from '../stages/reasoning-engine';
import { criticVerifier } from '../stages/critic-verifier';
import { narrativeGenerator } from '../stages/narrative-generator';
import { CandidateDetail, EnrichedCandidate, PipelineError, PipelineResult } from './types';
import type { RawPreference } from '../stages/constraint-extractor';

export interface EventDataRecord {
  id: string;
  title: string;
  event_date: string | null;
  guest_count: number;
  location_hint: string;
}

export interface LoadedEventData {
  event: EventDataRecord;
  preferences: RawPreference[];
}

export type EventDataLoader = (eventId: string) => Promise<LoadedEventData>;

type GuestPreferenceRow = {
  invitation_id: string;
  event_id: string;
  dietary: string[] | null;
  cuisine_prefs: string[] | null;
  cuisine_avoid: string[] | null;
  budget_min: number | null;
  budget_max: number | null;
  location_pref: string | null;
  vibe_pref: string | null;
  notes: string | null;
};

type InvitationRow = {
  id: string;
  status: string;
};

function preferenceToRawText(preference: GuestPreferenceRow): string {
  return [
    preference.dietary?.length ? `Dietary: ${preference.dietary.join(', ')}` : '',
    preference.cuisine_prefs?.length ? `Cuisine likes: ${preference.cuisine_prefs.join(', ')}` : '',
    preference.cuisine_avoid?.length ? `Cuisine avoids: ${preference.cuisine_avoid.join(', ')}` : '',
    preference.budget_min !== null || preference.budget_max !== null
      ? `Budget: ${preference.budget_min ?? 0}-${preference.budget_max ?? 999999} cents`
      : '',
    preference.location_pref ? `Location: ${preference.location_pref}` : '',
    preference.vibe_pref ? `Vibe: ${preference.vibe_pref}` : '',
    preference.notes ? `Notes: ${preference.notes}` : '',
  ].filter(Boolean).join('\n');
}

function buildCandidateDetails(candidates: EnrichedCandidate[]): Record<string, CandidateDetail> {
  return Object.fromEntries(candidates.map(candidate => [
    candidate.place_id,
    {
      name: candidate.name,
      address: candidate.address,
      cuisine_types: candidate.cuisine_types,
      price_range: candidate.price_range,
      rating: candidate.rating,
      review_summary: candidate.review_summary,
      image_url: candidate.image_url,
      maps_url: candidate.maps_url,
    },
  ]));
}

export async function defaultLoader(eventId: string): Promise<LoadedEventData> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();
  if (eventError || !event) {
    throw new PipelineError('load-event-data', eventError instanceof Error ? eventError : new Error('event not found'));
  }

  const { data: invitations, error: invitationsError } = await supabase
    .from('invitations')
    .select('id,status')
    .eq('event_id', eventId);
  if (invitationsError) {
    throw new PipelineError('load-event-data', invitationsError instanceof Error ? invitationsError : new Error('failed to load invitations'));
  }

  const { data: preferenceRows, error: preferencesError } = await supabase
    .from('guest_preferences')
    .select('*')
    .eq('event_id', eventId);
  if (preferencesError || !preferenceRows?.length) {
    throw new PipelineError('load-event-data', preferencesError instanceof Error ? preferencesError : new Error('no preferences found'));
  }

  const invitationById = new Map((invitations as InvitationRow[] | null ?? []).map(invitation => [invitation.id, invitation]));
  const preferences = (preferenceRows as GuestPreferenceRow[]).map(preference => ({
    guest_id: preference.invitation_id,
    invitation_id: preference.invitation_id,
    event_id: preference.event_id,
    raw_text: preferenceToRawText(preference),
    weight_multiplier: invitationById.get(preference.invitation_id)?.status === 'accepted' ? 1.0 : 0.8,
  }));

  const eventRecord = event as {
    id: string;
    title: string;
    proposed_date?: string | null;
    event_date?: string | null;
    guest_count?: number | null;
    location_hint?: string | null;
  };

  return {
    event: {
      id: eventRecord.id,
      title: eventRecord.title,
      event_date: eventRecord.event_date ?? eventRecord.proposed_date ?? null,
      guest_count: eventRecord.guest_count ?? Math.max(preferences.length, invitations?.length ?? 0),
      location_hint: eventRecord.location_hint ?? '',
    },
    preferences,
  };
}

export async function runPipeline(
  eventId: string,
  options?: { loader?: EventDataLoader; locationHint?: string },
): Promise<PipelineResult> {
  const startMs = Date.now();
  const loader = options?.loader ?? defaultLoader;

  let eventData: LoadedEventData;
  try {
    eventData = await loader(eventId);
  } catch (err) {
    if (err instanceof PipelineError) throw err;
    throw new PipelineError('load-event-data', err instanceof Error ? err : new Error(String(err)));
  }

  const { event, preferences } = eventData;
  const locationHint = options?.locationHint ?? event.location_hint;
  if (!locationHint) {
    throw new PipelineError('load-event-data', new Error('event location_hint is required'));
  }

  const dealbreakers = await dealbreakerDetector.run(preferences);
  const implicit = implicitInference.run(event);
  const constraints = await constraintExtractor.run(preferences, dealbreakers, implicit);
  const candidates = await geminiMapsGrounding(locationHint, constraints);
  const candidateDetails = buildCandidateDetails(candidates);
  const enrichedCandidates = await menuPhantom(candidates, constraints);
  const scored = deterministicScorer.score(enrichedCandidates, constraints);
  const qualified = scored.filter(candidate => !candidate.disqualified);

  if (qualified.length === 0) {
    throw new PipelineError('orchestrator', new Error('all candidates were disqualified'));
  }

  const withVibes = await vibeEmbedder.run(qualified, constraints);
  const top5 = await reranker.run(withVibes, constraints);
  const fairnessAnnotated = fairnessChecker.run(top5, constraints);
  const proposals = await reasoningEngine.run(fairnessAnnotated, constraints, implicit);
  const verified = await criticVerifier.run(proposals, constraints, fairnessAnnotated);

  const MAX_PROPOSALS = 3;

  // Fill critic-removed slots from remaining reranked candidates (bounded, no extra AI calls)
  if (verified.length < MAX_PROPOSALS && verified.length > 0) {
    const usedIds = new Set(verified.map(p => p.place_id));
    for (const alt of fairnessAnnotated) {
      if (verified.length >= MAX_PROPOSALS) break;
      if (usedIds.has(alt.place_id)) continue;
      usedIds.add(alt.place_id);
      const newRank = (verified.length + 1) as 1 | 2 | 3;
      verified.push({
        place_id:            alt.place_id,
        rank:                newRank,
        reasoning:           alt.constraintMatchSummary || `Alternate selection: ${alt.name}`,
        constraints_met:     alt.bonuses.slice(0, 3),
        constraints_gap:     alt.penalties.slice(0, 3),
        fairness_note:       'Selected as an alternate after critic review.',
        envy_scores:         alt.envy_scores ?? {},
        constraint_coverage: Object.fromEntries(
          Object.entries(alt.dietaryAnalysis).map(([k, v]) => [k, v >= 0.5])
        ),
        narrative_group:     '',
        narrative_personal:  {},
        confidence_score:    alt.confidence,
      });
    }
  }

  const withNarratives = await narrativeGenerator.run(verified, constraints);

  return {
    eventId,
    proposals: withNarratives,
    groupSummary: withNarratives[0]?.narrative_group
      || withNarratives
          .slice(0, 3)
          .map(p => candidateDetails[p.place_id]?.name ?? p.place_id)
          .filter(Boolean)
          .join(', '),
    conflictsResolved: [],
    totalLatencyMs: Date.now() - startMs,
    totalCostMicros: 0,
    candidateDetails,
  };
}
