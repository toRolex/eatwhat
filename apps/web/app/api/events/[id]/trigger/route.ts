import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TriggerEventSchema } from '@groupplan/types';
import { getEventById, getPreferencesByEvent, replaceProposalsAndAdvance, getInvitationsByEvent, logUsage } from '@groupplan/db';
import { ClaudeAIProvider, runPipeline } from '@groupplan/ai';
import { GooglePlacesVenueProvider, YelpVenueProvider } from '@groupplan/venues';
import type { RestaurantCandidate } from '@groupplan/ai';
import { ensureEnvLoaded } from '@/lib/env';
import { getNotificationService, sendBatch, appUrl } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';

ensureEnvLoaded();

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Per-user rate limit: 10 triggers per hour
  const userRl = rateLimit(`trigger:user:${user.id}`, 10, 3600000);
  if (!userRl.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: userRl.retryAfterSec }, { status: 429 });
  }

  const { data: event } = await getEventById(supabase, id);
  if (!event || event.host_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Per-event rate limit: 1 trigger per 5 minutes
  const eventRl = rateLimit(`trigger:event:${id}`, 1, 300000);
  if (!eventRl.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded', retryAfterSec: eventRl.retryAfterSec }, { status: 429 });
  }

  if (event.status !== 'collecting' && event.status !== 'deciding') {
    return NextResponse.json(
      { error: 'AI synthesis can only run while status is collecting or deciding' },
      { status: 422 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = TriggerEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Re-running in `deciding` wipes existing proposals (and their votes via FK
  // cascade). Force the host to acknowledge that.
  if (event.status === 'deciding' && !parsed.data.confirm_rerun) {
    return NextResponse.json(
      { error: 'Re-running will discard existing proposals and votes. Resend with confirm_rerun=true.', code: 'rerun_confirmation_required' },
      { status: 409 },
    );
  }

  const serviceDb = createServiceClient();
  const { data: preferences } = await getPreferencesByEvent(serviceDb, id);
  if (!preferences?.length) {
    return NextResponse.json({ error: 'No preferences submitted yet' }, { status: 422 });
  }

  const location = parsed.data.location_override ?? event.location_hint ?? '';
  if (!location) {
    return NextResponse.json({ error: 'No location available for venue search' }, { status: 422 });
  }

  if (process.env.PIPELINE_V2 === 'true') {
    const requiredV2Vars = [
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_MODEL_FAST',
      'ANTHROPIC_MODEL_REASONING',
      'GEMINI_API_KEY',
      'GEMINI_MODEL',
      'VOYAGE_API_KEY',
      'VOYAGE_MODEL',
    ];
    const missingVars = requiredV2Vars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      console.error(`[trigger] Pipeline v2 misconfigured: missing env vars: ${missingVars.join(', ')}`);
      return NextResponse.json(
        { error: 'Pipeline v2 is not configured correctly.', code: 'v2_misconfigured', missing: missingVars },
        { status: 500 },
      );
    }

    const pipelineResult = await runPipeline(id, { locationHint: location });
    const proposalRows = pipelineResult.proposals.flatMap((p) => {
      const candidate = pipelineResult.candidateDetails[p.place_id];
      if (!candidate) {
        console.warn(`[trigger] Pipeline v2 returned unknown place_id ${p.place_id} — skipping`);
        return [];
      }

      return [{
        event_id:           id,
        rank:               p.rank,
        restaurant_name:    candidate.name,
        restaurant_addr:    candidate.address,
        cuisine_type:       candidate.cuisine_types[0] ?? '',
        price_range:        candidate.price_range,
        rating:             candidate.rating,
        image_url:          candidate.image_url ?? null,
        maps_url:           candidate.maps_url ?? null,
        booking_url:        null,
        reasoning:          p.reasoning,
        constraints_met:    Object.fromEntries(p.constraints_met.map((label) => [label, true])),
        constraints_gap:    Object.fromEntries(p.constraints_gap.map((gap) => [gap, gap])),
        suggested_time:     null,
        envy_scores:        Object.keys(p.envy_scores ?? {}).length > 0 ? p.envy_scores : null,
        narrative_group:    p.narrative_group || null,
        narrative_personal: Object.keys(p.narrative_personal ?? {}).length > 0 ? p.narrative_personal : null,
        confidence_score:   p.confidence_score,
      }];
    });

    if (!proposalRows.length) {
      return NextResponse.json({ error: 'Pipeline v2 returned no valid proposals' }, { status: 500 });
    }

    const { error: rpcError } = await replaceProposalsAndAdvance(serviceDb, id, proposalRows);
    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });

    await logUsage(serviceDb, {
      event_id:      id,
      kind:          'ai_synthesis',
      provider:      'pipeline_v2',
      model:         'multi-stage',
      cost_micros:   pipelineResult.totalCostMicros,
      request_count: 1,
      metadata:      {
        proposals_returned: proposalRows.length,
        latency_ms: pipelineResult.totalLatencyMs,
        conflicts_resolved: pipelineResult.conflictsResolved,
      },
    }).catch(() => {});

    const notifier = getNotificationService();
    let emailSummary: { sent: number; failed: number } | null = null;
    if (notifier) {
      const { data: invitations } = await getInvitationsByEvent(serviceDb, id);
      const accepted = (invitations ?? []).filter((i) => i.status === 'accepted');
      const batch = await sendBatch(
        notifier,
        accepted.map((inv) => ({
          to:       { name: inv.name, email: inv.email },
          template: 'proposals-ready' as const,
          data:     { event_title: event.title, vote_url: `${appUrl()}/invite/${inv.invite_token}/vote` },
        })),
        `trigger event ${id}`,
      );
      emailSummary = { sent: batch.sent, failed: batch.failed };
    }

    return NextResponse.json({ ok: true, emails: emailSummary, pipeline: 'v2' });
  }

  // Legacy path continues below
  // 1. Fetch candidate restaurants — prefer Google Places, fall back to Yelp
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  const venueProvider = googleKey ? 'google_places' : 'yelp';
  const venues = googleKey
    ? new GooglePlacesVenueProvider(googleKey)
    : new YelpVenueProvider(process.env.YELP_API_KEY!);
  const candidates = await venues.searchVenues({ location, limit: 20 });

  // Log venue search spend. Google Places Text Search New is $32/1k, ~$0.032/call.
  // Yelp Fusion is free at moderate volume; log 0 cost.
  await logUsage(serviceDb, {
    event_id:      id,
    kind:          'venue_search',
    provider:      venueProvider,
    cost_micros:   venueProvider === 'google_places' ? 32_000 : 0,
    request_count: 1,
    metadata:      { location, result_count: candidates.length },
  }).catch(() => {});

  const aiCandidates: RestaurantCandidate[] = candidates.map((v) => ({
    id:            v.id,
    name:          v.name,
    address:       v.address,
    cuisine_types: v.cuisine_types,
    price_range:   v.price_range,
    rating:        v.rating,
    review_count:  v.review_count,
    image_url:     v.image_url,
    maps_url:      v.maps_url,
    booking_url:   v.booking_url,
  }));

  // 2. Run AI synthesis — one structured call, no streaming
  const ai = new ClaudeAIProvider(process.env.ANTHROPIC_API_KEY!);
  const synthesis = await ai.synthesizeRestaurantProposals({
    event: {
      title:         event.title,
      location_hint: location,
      proposed_date: event.proposed_date ?? undefined,
    },
    preferences,
    candidates: aiCandidates,
    count: parsed.data.count ?? 5,
  });

  // 3. Persist proposals and advance the event state
  const proposalRows = synthesis.proposals.flatMap((p) => {
    const candidate = candidates.find((c) => c.id === p.candidate_id);
    if (!candidate) {
      console.warn(`[trigger] AI returned unknown candidate_id ${p.candidate_id} — skipping`);
      return [];
    }
    return [{
      event_id:        id,
      rank:            p.rank,
      restaurant_name: candidate.name,
      restaurant_addr: candidate.address,
      cuisine_type:    candidate.cuisine_types[0] ?? '',
      price_range:     candidate.price_range,
      rating:          candidate.rating,
      image_url:       candidate.image_url,
      maps_url:        candidate.maps_url,
      booking_url:     candidate.booking_url,
      reasoning:       p.reasoning,
      constraints_met: p.constraints_met,
      constraints_gap: p.constraints_gap,
      suggested_time:  p.suggested_time,
    }];
  });

  if (!proposalRows.length) {
    return NextResponse.json({ error: 'AI returned no valid proposals — all candidate IDs were unrecognized' }, { status: 500 });
  }

  // Replace any prior proposals so re-runs don't pile up stale picks
  const { error: rpcError } = await replaceProposalsAndAdvance(serviceDb, id, proposalRows);
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });

  // Log AI spend
  if (synthesis.usage) {
    await logUsage(serviceDb, {
      event_id:      id,
      kind:          'ai_synthesis',
      provider:      'anthropic',
      model:         synthesis.usage.model,
      input_tokens:  synthesis.usage.input_tokens,
      output_tokens: synthesis.usage.output_tokens,
      cost_micros:   synthesis.usage.cost_micros,
      metadata:      { proposals_returned: proposalRows.length, candidates_considered: candidates.length },
    }).catch(() => {});
  }

  // Notify all accepted guests that voting is open
  const notifier = getNotificationService();
  let emailSummary: { sent: number; failed: number } | null = null;
  if (notifier) {
    const { data: invitations } = await getInvitationsByEvent(serviceDb, id);
    const accepted = (invitations ?? []).filter((i) => i.status === 'accepted');
    const batch = await sendBatch(
      notifier,
      accepted.map((inv) => ({
        to:       { name: inv.name, email: inv.email },
        template: 'proposals-ready' as const,
        data:     { event_title: event.title, vote_url: `${appUrl()}/invite/${inv.invite_token}/vote` },
      })),
      `trigger event ${id}`,
    );
    emailSummary = { sent: batch.sent, failed: batch.failed };
  }

  return NextResponse.json({ ok: true, emails: emailSummary });
}
