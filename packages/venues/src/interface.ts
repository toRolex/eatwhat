export interface VenueSearchParams {
  location: string;
  cuisine_types?: string[];
  // 1–4 matching Yelp tiers; abstracted so Google Places mapping is trivial
  price_tiers?: Array<1 | 2 | 3 | 4>;
  radius_meters?: number;
  limit?: number;
}

export interface VenueResult {
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
  phone?: string;
}

// Implement this interface to swap Yelp for Google Places or any other provider
export interface VenueProvider {
  searchVenues(params: VenueSearchParams): Promise<VenueResult[]>;
}
