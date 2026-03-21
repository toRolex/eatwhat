import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TriggerEventSchema } from '@groupplan/types';
import { getEventById, getPreferencesByEvent, updateEventStatus, insertProposals } from '@groupplan/db';
import { ClaudeAIProvider } from '@groupplan/ai';
import { YelpVenueProvider } from '@groupplan/venues';
import type { RestaurantCandidate } from '@groupplan/ai';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: event } = await getEventById(supabase as never, id);
  if (!event || event.host_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (event.status !== 'collecting') {
    return NextResponse.json(
      { error: 'AI synthesis can only run while status is collecting' },
      { status: 422 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = TriggerEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const serviceDb = createServiceClient();
  const { data: preferences } = await getPreferencesByEvent(serviceDb as never, id);
  if (!preferences?.length) {
    return NextResponse.json({ error: 'No preferences submitted yet' }, { status: 422 });
  }

  const location = parsed.data.location_override ?? event.location_hint ?? '';
  if (!location) {
    return NextResponse.json({ error: 'No location available for venue search' }, { status: 422 });
  }

  // 1. Fetch candidate restaurants from Yelp
  const venues = new YelpVenueProvider(process.env.YELP_API_KEY!);
  const candidates = await venues.searchVenues({ location, limit: 20 });

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
  });

  // 3. Persist proposals and advance the event state
  const proposalRows = synthesis.proposals.map((p) => {
    const candidate = candidates.find((c) => c.id === p.candidate_id)!;
    return {
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
    };
  });

  const { error: insertError } = await insertProposals(serviceDb as never, proposalRows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await updateEventStatus(serviceDb as never, id, 'deciding');

  // TODO: notify all accepted guests that voting is open

  return NextResponse.json({ ok: true });
}
