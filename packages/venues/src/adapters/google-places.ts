import type { VenueProvider, VenueSearchParams, VenueResult } from '../interface';
import { fetchWithRetry } from '../retry';

const NEW_API_BASE    = 'https://places.googleapis.com/v1/places:searchText';
const LEGACY_API_BASE = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const LEGACY_PHOTO    = 'https://maps.googleapis.com/maps/api/place/photo';

// Maps Google's priceLevel enum/integer to display strings
const PRICE_MAP_NEW: Record<string, string> = {
  PRICE_LEVEL_FREE:           '$',
  PRICE_LEVEL_INEXPENSIVE:    '$',
  PRICE_LEVEL_MODERATE:       '$$',
  PRICE_LEVEL_EXPENSIVE:      '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};
const PRICE_MAP_LEGACY: Record<number, string> = { 0: '$', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

function typeToLabel(t: string): string {
  return t.replace(/_restaurant$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.types',
  'places.priceLevel', 'places.rating', 'places.userRatingCount',
  'places.googleMapsUri', 'places.websiteUri', 'places.photos',
].join(',');

export class GooglePlacesVenueProvider implements VenueProvider {
  constructor(private readonly apiKey: string) {}

  async searchVenues(params: VenueSearchParams): Promise<VenueResult[]> {
    const query = params.cuisine_types?.length
      ? `${params.cuisine_types.join(' or ')} restaurants in ${params.location}`
      : `restaurants in ${params.location}`;

    // Try the new Places API (cheaper, $5/1000). Fall back to legacy on 403.
    try {
      return await this.searchNew(query, params.limit ?? 20);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('SERVICE_DISABLED')) {
        return this.searchLegacy(query, params.limit ?? 20);
      }
      throw err;
    }
  }

  // ── New Places API (v1) ──────────────────────────────────────────────────
  private async searchNew(query: string, limit: number): Promise<VenueResult[]> {
    const res = await fetchWithRetry(NEW_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   this.apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery:      query,
        maxResultCount: Math.min(limit, 20),
        languageCode:   'en',
      }),
    });

    if (!res.ok) throw new Error(`Google Places (new) error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as { places?: NewPlace[] };
    return (data.places ?? [])
      .filter((p) => p.displayName?.text)
      .map((p) => this.mapNew(p));
  }

  private mapNew(p: NewPlace): VenueResult {
    const cuisineTypes = (p.types ?? [])
      .filter((t) => t.endsWith('_restaurant') || t.endsWith('_food'))
      .slice(0, 3)
      .map(typeToLabel);
    if (!cuisineTypes.length) cuisineTypes.push('Restaurant');

    const photoRef = p.photos?.[0]?.name;
    const imageUrl = photoRef
      ? `https://places.googleapis.com/v1/${photoRef}/media?maxHeightPx=400&key=${this.apiKey}`
      : undefined;

    return {
      id:            p.id,
      name:          p.displayName.text,
      address:       p.formattedAddress ?? '',
      cuisine_types: cuisineTypes,
      price_range:   PRICE_MAP_NEW[p.priceLevel ?? ''] ?? '$$',
      rating:        p.rating ?? 0,
      review_count:  p.userRatingCount ?? 0,
      image_url:     imageUrl,
      maps_url:      p.googleMapsUri,
      booking_url:   p.websiteUri,
    };
  }

  // ── Legacy Places API (Text Search) ──────────────────────────────────────
  private async searchLegacy(query: string, limit: number): Promise<VenueResult[]> {
    const qs = new URLSearchParams({
      query,
      key:  this.apiKey,
      type: 'restaurant',
    });
    const res = await fetchWithRetry(`${LEGACY_API_BASE}?${qs}`);
    if (!res.ok) throw new Error(`Google Places (legacy) error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as LegacyResponse;
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places (legacy) status ${data.status}: ${data.error_message ?? ''}`);
    }

    return (data.results ?? []).slice(0, limit).map((r) => this.mapLegacy(r));
  }

  private mapLegacy(r: LegacyPlace): VenueResult {
    const cuisineTypes = (r.types ?? [])
      .filter((t) => t !== 'restaurant' && t !== 'food' && t !== 'point_of_interest' && t !== 'establishment')
      .slice(0, 3)
      .map(typeToLabel);
    if (!cuisineTypes.length) cuisineTypes.push('Restaurant');

    const photoRef = r.photos?.[0]?.photo_reference;
    const imageUrl = photoRef
      ? `${LEGACY_PHOTO}?maxwidth=400&photo_reference=${photoRef}&key=${this.apiKey}`
      : undefined;

    return {
      id:            r.place_id,
      name:          r.name,
      address:       r.formatted_address ?? '',
      cuisine_types: cuisineTypes,
      price_range:   PRICE_MAP_LEGACY[r.price_level ?? 2] ?? '$$',
      rating:        r.rating ?? 0,
      review_count:  r.user_ratings_total ?? 0,
      image_url:     imageUrl,
      maps_url:      `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
    };
  }
}

// ── Type shapes ────────────────────────────────────────────────────────────
interface NewPlace {
  id: string;
  displayName: { text: string; languageCode?: string };
  formattedAddress?: string;
  types?: string[];
  priceLevel?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  photos?: Array<{ name: string }>;
}

interface LegacyPlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{ photo_reference: string }>;
}

interface LegacyResponse {
  status: string;
  results?: LegacyPlace[];
  error_message?: string;
}
