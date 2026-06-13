import seedData from '../data/shenzhen_concrete_venue_seed.v0.1.json';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VenueSource {
  id: string;
  name: string;
  url: string;
}

export interface Venue {
  id: string;
  name: string;
  branchName: string | null;
  city: string;
  district: string;
  businessAreaId: string;
  businessAreaName: string;
  address: string;
  lat: number;
  lng: number;
  locationPrecision: string;
  venueType: string;
  cuisineTags: string[];
  activityTags: string[];
  tasteTags: string[];
  avgCost: number | null;
  rating: number | null;
  suitableEventModes: string[];
  source: string;
}

export interface VenueSearchParams {
  area?: string;
  categories?: string[];
  budgetMin?: number;
  budgetMax?: number;
  venueTypes?: string[];
}

// ── Internal helpers ───────────────────────────────────────────────────────────

let _venuesCache: Venue[] | null = null;
let _sourcesCache: VenueSource[] | null = null;

function getVenues(): Venue[] {
  if (!_venuesCache) {
    _venuesCache = (seedData as any).venues as Venue[];
  }
  return _venuesCache;
}

function getSources(): VenueSource[] {
  if (!_sourcesCache) {
    _sourcesCache = (seedData as any).sources as VenueSource[];
  }
  return _sourcesCache;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Load all 56 venues from the local seed JSON (read-only). */
export function loadVenues(): Venue[] {
  return getVenues();
}

/** Load metadata about data sources. */
export function loadSources(): VenueSource[] {
  return getSources();
}

/**
 * Search venues by area, categories (cuisine), budget range, and venue types.
 *
 * Matching is case-insensitive and uses partial substring matching on
 * district and businessAreaName for area, and exact tag membership for
 * categories.
 */
export function searchVenues(params: VenueSearchParams = {}): Venue[] {
  const { area, categories, budgetMin, budgetMax, venueTypes } = params;
  let results = getVenues();

  if (area) {
    const q = area.toLowerCase();
    results = results.filter(
      (v) =>
        v.district.toLowerCase().includes(q) ||
        v.businessAreaName.toLowerCase().includes(q),
    );
  }

  if (categories && categories.length > 0) {
    results = results.filter((v) =>
      categories.some((cat) =>
        v.cuisineTags.some((tag) => tag.toLowerCase() === cat.toLowerCase()),
      ),
    );
  }

  if (venueTypes && venueTypes.length > 0) {
    results = results.filter((v) =>
      venueTypes.some((vt) => vt.toLowerCase() === v.venueType.toLowerCase()),
    );
  }

  if (budgetMin !== undefined) {
    results = results.filter((v) => v.avgCost !== null && v.avgCost >= budgetMin);
  }

  if (budgetMax !== undefined) {
    results = results.filter((v) => v.avgCost !== null && v.avgCost <= budgetMax);
  }

  return results;
}

// ── Conversion helpers ─────────────────────────────────────────────────────────

/** Default operating hours per venue type (fallback when JSON has no hours). */
const DEFAULT_HOURS: Record<string, string> = {
  restaurant: '11:00-22:00',
  cafe: '08:00-22:00',
  dessert: '10:00-22:30',
  bar: '17:00-02:00',
  ktv: '12:00-02:00',
  livehouse: '18:00-02:00',
  arcade: '10:00-22:00',
  board_game: '10:00-23:00',
  escape_room: '10:00-22:00',
  script_murder: '10:00-23:00',
  nail_salon: '10:00-21:00',
};

function avgCostToPriceRange(avgCost: number | null): string {
  if (avgCost === null) return '$$';
  if (avgCost < 50) return '$';
  if (avgCost < 100) return '$$';
  if (avgCost < 200) return '$$$';
  return '$$$$';
}

export interface VenueRecord {
  name: string;
  address: string;
  cuisine_type: string;
  cuisine_types: string[];
  price_range: string;
  rating: number;
  review_count: number;
  tags: string[];
  hours: string;
}

/** Convert a raw Venue to the VenueRecord format used by the AI synthesizer. */
export function toVenueRecord(v: Venue): VenueRecord {
  const allTags = [...v.cuisineTags, ...v.activityTags, ...v.tasteTags];
  return {
    name: v.branchName ? `${v.name} (${v.branchName})` : v.name,
    address: v.address,
    cuisine_type: v.cuisineTags[0] ?? v.venueType,
    cuisine_types: v.cuisineTags,
    price_range: avgCostToPriceRange(v.avgCost),
    rating: v.rating ?? 0,
    review_count: 0,
    tags: allTags,
    hours: DEFAULT_HOURS[v.venueType] ?? '10:00-22:00',
  };
}
