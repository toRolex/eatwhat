import type { VenueProvider, VenueSearchParams, VenueResult } from '../interface';
import { fetchWithRetry } from '../retry';

const YELP_API_BASE = 'https://api.yelp.com/v3';

// Yelp price tier to display string
const PRICE_MAP: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

export class YelpVenueProvider implements VenueProvider {
  constructor(private readonly apiKey: string) {}

  async searchVenues(params: VenueSearchParams): Promise<VenueResult[]> {
    const qs = new URLSearchParams({
      location: params.location,
      limit: String(Math.min(params.limit ?? 20, 50)),
      sort_by: 'rating',
    });

    if (params.cuisine_types?.length) {
      qs.set('categories', params.cuisine_types.join(','));
    }
    if (params.price_tiers?.length) {
      qs.set('price', params.price_tiers.join(','));
    }
    if (params.radius_meters) {
      // Yelp max radius is 40,000 meters
      qs.set('radius', String(Math.min(params.radius_meters, 40_000)));
    }

    const res = await fetchWithRetry(`${YELP_API_BASE}/businesses/search?${qs}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!res.ok) {
      throw new Error(`Yelp API error ${res.status}: ${await res.text()}`);
    }

    const body = (await res.json()) as { businesses: YelpBusiness[] };
    return body.businesses.map(this.mapBusiness);
  }

  private mapBusiness(b: YelpBusiness): VenueResult {
    const addr = [b.location.address1, b.location.city, b.location.state]
      .filter(Boolean)
      .join(', ');

    return {
      id:           b.id,
      name:         b.name,
      address:      addr,
      cuisine_types: b.categories.map((c) => c.title),
      price_range:  PRICE_MAP[b.price?.length ?? 1] ?? '$',
      rating:       b.rating,
      review_count: b.review_count,
      image_url:    b.image_url || undefined,
      maps_url:     b.url,
      phone:        b.display_phone || undefined,
    };
  }
}

// Minimal Yelp API response shape — only fields we use
interface YelpBusiness {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  price?: string;
  image_url?: string;
  url: string;
  display_phone?: string;
  categories: Array<{ alias: string; title: string }>;
  location: {
    address1?: string;
    city: string;
    state: string;
  };
}
