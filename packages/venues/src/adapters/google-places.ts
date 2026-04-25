import type { VenueProvider, VenueSearchParams, VenueResult } from '../interface';

const BASE = 'https://places.googleapis.com/v1/places:searchText';

// Maps Google's priceLevel enum to display strings
const PRICE_MAP: Record<string, string> = {
  PRICE_LEVEL_FREE:          '$',
  PRICE_LEVEL_INEXPENSIVE:   '$',
  PRICE_LEVEL_MODERATE:      '$$',
  PRICE_LEVEL_EXPENSIVE:     '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE:'$$$$',
};

// Converts Google type strings like "italian_restaurant" → "Italian"
function typeToLabel(t: string): string {
  return t
    .replace(/_restaurant$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Fields we request — minimises billing cost (Basic SKU only)
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.types',
  'places.priceLevel',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.websiteUri',
  'places.photos',
].join(',');

export class GooglePlacesVenueProvider implements VenueProvider {
  constructor(private readonly apiKey: string) {}

  async searchVenues(params: VenueSearchParams): Promise<VenueResult[]> {
    const query = params.cuisine_types?.length
      ? `${params.cuisine_types.join(' or ')} restaurants in ${params.location}`
      : `restaurants in ${params.location}`;

    const body: Record<string, unknown> = {
      textQuery:      query,
      maxResultCount: Math.min(params.limit ?? 20, 20),
      languageCode:   'en',
    };

    if (params.price_tiers?.length) {
      // Google uses 1–4 mapped to PRICE_LEVEL_* — filter client-side after fetch
    }

    const res = await fetch(BASE, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Goog-Api-Key':  this.apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Google Places error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { places?: GooglePlace[] };
    const places = data.places ?? [];

    return places
      .filter((p) => p.displayName?.text)
      .map((p) => this.mapPlace(p));
  }

  private mapPlace(p: GooglePlace): VenueResult {
    const cuisineTypes = (p.types ?? [])
      .filter((t) => t.endsWith('_restaurant') || t.endsWith('_food'))
      .slice(0, 3)
      .map(typeToLabel);

    // Fall back to generic "Restaurant" if Google returned no cuisine types
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
      price_range:   PRICE_MAP[p.priceLevel ?? ''] ?? '$$',
      rating:        p.rating ?? 0,
      review_count:  p.userRatingCount ?? 0,
      image_url:     imageUrl,
      maps_url:      p.googleMapsUri,
      booking_url:   p.websiteUri,
    };
  }
}

// Minimal shape — only fields in our FIELD_MASK
interface GooglePlace {
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
