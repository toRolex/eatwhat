import { NextResponse } from 'next/server';
import { ClaudeAIProvider } from '@groupplan/ai';
import { GooglePlacesVenueProvider, YelpVenueProvider } from '@groupplan/venues';
import type { RestaurantCandidate } from '@groupplan/ai';
import type { GuestPreferences } from '@groupplan/types';
import { ensureEnvLoaded } from '@/lib/env';
import { signPhotoRef } from '@/lib/photo-signing';
import { rateLimit, clientIp } from '@/lib/rate-limit';

ensureEnvLoaded();

// Demo endpoint hits Anthropic + Google Places — both cost real money. Cap
// per-IP requests so a stranger with the URL can't drain quota in a loop.
const DEMO_LIMIT       = 3;
const DEMO_WINDOW_MS   = 60 * 60 * 1000; // 1 hour

// Mock preferences mirroring the demo GUESTS_DATA so the demo AI feels real
const DEMO_PREFERENCES: GuestPreferences[] = [
  {
    id: 'd1', invitation_id: 'd1', event_id: 'demo', created_at: '', updated_at: '',
    dietary: ['Vegetarian'], cuisine_prefs: ['Italian', 'Japanese'], cuisine_avoid: [],
    budget_min: 20, budget_max: 50, location_pref: null, availability: null,
    vibe_pref: 'cozy', notes: null,
  },
  {
    id: 'd2', invitation_id: 'd2', event_id: 'demo', created_at: '', updated_at: '',
    dietary: [], cuisine_prefs: ['Mexican', 'Korean'], cuisine_avoid: [],
    budget_min: 15, budget_max: 40, location_pref: null, availability: null,
    vibe_pref: 'lively', notes: null,
  },
  {
    id: 'd3', invitation_id: 'd3', event_id: 'demo', created_at: '', updated_at: '',
    dietary: ['Vegan'], cuisine_prefs: ['Thai', 'Mediterranean'], cuisine_avoid: [],
    budget_min: 25, budget_max: 60, location_pref: null, availability: null,
    vibe_pref: 'date night', notes: null,
  },
  {
    id: 'd4', invitation_id: 'd4', event_id: 'demo', created_at: '', updated_at: '',
    dietary: ['Gluten-free'], cuisine_prefs: ['Italian', 'French'], cuisine_avoid: ['Mexican'],
    budget_min: 40, budget_max: 80, location_pref: null, availability: null,
    vibe_pref: 'upscale casual', notes: null,
  },
  {
    id: 'd5', invitation_id: 'd5', event_id: 'demo', created_at: '', updated_at: '',
    dietary: [], cuisine_prefs: ['Japanese', 'Korean', 'Chinese'], cuisine_avoid: [],
    budget_min: 20, budget_max: 50, location_pref: null, availability: null,
    vibe_pref: 'group friendly', notes: null,
  },
];

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = rateLimit(`demo-synth:${ip}`, DEMO_LIMIT, DEMO_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demo limit reached (${DEMO_LIMIT}/hour). Try again in ${Math.ceil(rl.retryAfterSec / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => ({})) as { location?: string };
  const location = (body.location as string | undefined)?.trim() || 'New York, NY';

  const googleKey  = process.env.GOOGLE_PLACES_API_KEY;
  const yelpKey    = process.env.YELP_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if ((!googleKey && !yelpKey) || !anthropicKey) {
    return NextResponse.json({ error: 'API keys not configured — set GOOGLE_PLACES_API_KEY and ANTHROPIC_API_KEY in .env.local' }, { status: 503 });
  }

  // Prefer Google Places; fall back to Yelp if only Yelp key is present
  const venues = googleKey
    ? new GooglePlacesVenueProvider(googleKey)
    : new YelpVenueProvider(yelpKey!);
  const results = await venues.searchVenues({ location, limit: 20 });

  if (!results.length) {
    return NextResponse.json({ error: 'No venues found for that location' }, { status: 422 });
  }

  const candidates: RestaurantCandidate[] = results.map((v) => ({
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

  // 2. Run Claude synthesis
  const ai = new ClaudeAIProvider(anthropicKey);
  const synthesis = await ai.synthesizeRestaurantProposals({
    event: { title: 'Friday Group Dinner', location_hint: location },
    preferences: DEMO_PREFERENCES,
    candidates,
    count: 5,
  }).catch(() => null);

  if (!synthesis) {
    return NextResponse.json({ error: 'AI synthesis unavailable — try again shortly.' }, { status: 503 });
  }

  // 3. Return proposals enriched with venue data — no DB write for demo
  // Replace direct Google photo URLs (which contain the API key) with proxy URLs
  function proxyPhoto(rawUrl: string | undefined): string | null {
    if (!rawUrl) return null;
    if (rawUrl.includes('photo_reference=')) {
      const ref = new URL(rawUrl).searchParams.get('photo_reference');
      return ref ? `/api/demo/photo?legacy=${encodeURIComponent(signPhotoRef(ref))}` : null;
    }
    if (rawUrl.includes('places.googleapis.com/v1/places/')) {
      // extract `places/{id}/photos/{name}`
      const match = rawUrl.match(/places\/[^/]+\/photos\/[^/]+/);
      return match ? `/api/demo/photo?new=${encodeURIComponent(signPhotoRef(match[0]))}` : null;
    }
    return rawUrl;
  }

  const proposals = synthesis.proposals.flatMap((p) => {
    const venue = results.find((v) => v.id === p.candidate_id);
    if (!venue) return [];
    return [{
      rank:            p.rank,
      restaurant_name: venue.name,
      restaurant_addr: venue.address,
      cuisine_type:    venue.cuisine_types[0] ?? '',
      cuisine_types:   venue.cuisine_types,
      price_range:     venue.price_range,
      rating:          venue.rating,
      review_count:    venue.review_count,
      image_url:       proxyPhoto(venue.image_url),
      maps_url:        venue.maps_url ?? null,
      reasoning:       p.reasoning,
      constraints_met: p.constraints_met,
      constraints_gap: p.constraints_gap,
    }];
  });

  return NextResponse.json({ proposals, location });
}
