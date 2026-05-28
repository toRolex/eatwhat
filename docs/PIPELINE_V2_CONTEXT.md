# GroupPlan AI Pipeline v2 — Claude Code Context

**Read this file at the start of every session before touching any code.**
**Also read PIPELINE_V2_PLAN.md for the full architecture reference.**

---

## Project

GroupPlan is a mobile-first web app that collects guest preferences for group
dining events and uses AI to produce 3 ranked restaurant proposals. Monorepo
using Next.js 14+ / Supabase / TypeScript / pnpm + Turborepo.

Repo: github.com/andersonmcalpine/groupplan

---

## Current Codebase State (before pipeline v2)

### Packages

```
packages/
├── ai/          @groupplan/ai    — single Claude Haiku adapter (being replaced)
├── venues/      @groupplan/venues — Google Places + Yelp fetching
├── notifications/ @groupplan/notifications
├── calendar/    @groupplan/calendar
└── db/          @groupplan/db    — Supabase client + typed queries
```

### App routes (apps/web)

```
app/api/events/[id]/trigger/route.ts   ← main pipeline entry point (being updated)
app/api/events/[id]/context/route.ts   ← new in session 7
app/api/events/
app/events/
app/invite/
```

### Supabase tables (current)

```
events          — event metadata, host, location_hint, event_date
invitations     — guest RSVPs linked to events
preferences     — raw free-text preference input per guest
restaurants     — cached Places/Yelp results
proposals       — AI-generated ranked proposals (being extended)
votes           — guest votes on proposals
users           — auth table
```

### Current AI adapter (packages/ai/src/adapters/claude.ts)

Single-shot pattern — takes raw preferences + restaurant list, returns 3
ranked proposals via assistant prefill JSON hack. This is what we are
replacing. Do not delete it — it stays behind the PIPELINE_V2 feature flag.

---

## Target: packages/ai directory layout after restructure

```
packages/ai/
├── src/
│   ├── pipeline/
│   │   ├── orchestrator.ts        — main entry point, runPipeline()
│   │   ├── parallel-runner.ts     — Promise.all wrapper for Track A + B
│   │   └── types.ts               — all shared interfaces
│   ├── stages/
│   │   ├── dealbreaker-detector.ts
│   │   ├── implicit-inference.ts
│   │   ├── constraint-extractor.ts
│   │   ├── deterministic-scorer.ts
│   │   ├── vibe-embedder.ts
│   │   ├── reranker.ts
│   │   ├── fairness-checker.ts
│   │   ├── reasoning-engine.ts
│   │   ├── critic-verifier.ts
│   │   └── narrative-generator.ts
│   ├── adapters/
│   │   ├── anthropic.ts
│   │   ├── gemini.ts
│   │   ├── cohere.ts
│   │   ├── voyage.ts
│   │   └── yelp-ai.ts
│   ├── prompts/
│   │   ├── dealbreaker.ts
│   │   ├── constraint-extraction.ts
│   │   ├── reasoning-system.ts
│   │   ├── critic-system.ts
│   │   └── narrative-system.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── cost-tracker.ts
│   │   └── cache.ts
│   └── interface.ts
├── package.json
└── tsconfig.json
```

---

## TypeScript Interfaces (pipeline/types.ts)

```typescript
export interface PipelineResult {
  eventId: string;
  proposals: ProposalWithNarrative[];
  groupSummary: string;
  conflictsResolved: string[];
  totalLatencyMs: number;
  totalCostMicros: number;
}

export interface PipelineStage<TInput, TOutput> {
  run(input: TInput): Promise<TOutput>;
}

export interface ImplicitContext {
  event_type_hint: 'work' | 'social' | 'date' | 'celebration' | 'general';
  meal_type: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'late_night';
  formality_bias: number;        // -1 (casual) to +1 (formal)
  group_size_class: 'intimate' | 'small' | 'medium' | 'large';
}

export interface StructuredConstraint {
  guest_id: string;
  invitation_id: string;
  event_id: string;
  dietary_hard: string[];
  dietary_soft: string[];
  cuisine_likes: Record<string, number>;  // { "italian": 0.9 }
  cuisine_avoids: string[];
  budget_min: number;            // cents
  budget_max: number;            // cents
  vibe_tags: string[];
  dealbreaker_flags: string[];
  intensity_tier: 'hard' | 'strong' | 'soft';
  weight_multiplier: number;     // default 1.0
  raw_text: string;
}

export interface RestaurantScore {
  place_id: string;
  name: string;
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
}

export interface EnvyScore {
  restaurant_id: string;
  envy_scores: Record<string, number>;  // { guest_uuid: 0.3 }
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
  narrative_personal: Record<string, string>;  // { guest_id: narrative }
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
```

---

## Database Schema — New Tables (migration 009_ai_pipeline.sql)

```sql
CREATE TABLE ai_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage         TEXT NOT NULL,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  input_hash    TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  latency_ms    INTEGER,
  cost_micros   INTEGER,
  raw_input     JSONB,
  raw_output    JSONB,
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_logs_event ON ai_logs(event_id);
CREATE INDEX idx_ai_logs_stage ON ai_logs(stage);

CREATE TABLE structured_constraints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id   UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  dietary_hard    TEXT[] DEFAULT '{}',
  dietary_soft    TEXT[] DEFAULT '{}',
  cuisine_likes   JSONB DEFAULT '{}',
  cuisine_avoids  TEXT[] DEFAULT '{}',
  budget_min      INTEGER,
  budget_max      INTEGER,
  vibe_tags       TEXT[] DEFAULT '{}',
  dealbreaker_flags TEXT[] DEFAULT '{}',
  intensity_tier  TEXT DEFAULT 'soft',
  raw_text        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_constraints_event ON structured_constraints(event_id);

CREATE TABLE restaurant_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id        TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  dietary_analysis JSONB,
  vibe_embedding  VECTOR(1024),
  review_summary  TEXT,
  menu_analysis   JSONB,
  last_analyzed   TIMESTAMPTZ DEFAULT now(),
  ttl_days        INTEGER DEFAULT 30
);
CREATE INDEX idx_rcache_place ON restaurant_cache(place_id);

ALTER TABLE proposals ADD COLUMN envy_scores JSONB;
ALTER TABLE proposals ADD COLUMN constraint_coverage JSONB;
ALTER TABLE proposals ADD COLUMN narrative_group TEXT;
ALTER TABLE proposals ADD COLUMN narrative_personal JSONB;
ALTER TABLE proposals ADD COLUMN confidence_score FLOAT;
```

---

## Environment Variables

```bash
# Existing
ANTHROPIC_API_KEY=
GOOGLE_PLACES_API_KEY=
YELP_API_KEY=

# New — all required before Session 4
GEMINI_API_KEY=
COHERE_API_KEY=
VOYAGE_API_KEY=
ANTHROPIC_MODEL_REASONING=claude-sonnet-4-6
ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001-20251001
PIPELINE_PARALLELISM=true
PIPELINE_LOG_LEVEL=info
PIPELINE_V2=false
```

---

## Stage Specifications

### Stage 1 — Dealbreaker Detector

File: `stages/dealbreaker-detector.ts`
Model: `ANTHROPIC_MODEL_FAST` (Haiku)
Method: `tool_use` — never prefill
Input: `{ guest_id: string, raw_text: string }[]`
Output: `{ guest_id: string, hard: string[], strong: string[], soft: string[] }[]`

Tool schema name: `classify_constraints`
Classification rule: escalate on uncertainty (false positive better than missed blocker)
- "I'm allergic" / "I can't eat" / medical context → hard
- "I don't eat" / "NO [food]" / firm budget → strong
- "I'd prefer" / "would be nice" / "I like" → soft

Logging: stage='dealbreaker', provider='anthropic'
Retry: 2 retries, 1s backoff, rate limit errors only

---

### Stage 2 — Implicit Inference

File: `stages/implicit-inference.ts`
Method: Pure TypeScript, synchronous, zero API calls
Input: event record (title, event_date, guest_count)
Output: `ImplicitContext`

Rules:
- Title contains "birthday"/"bday" → celebration, formality_bias +0.3
- Title contains "team"/"standup"/"offsite" → work, formality_bias +0.5
- 10am–2pm → lunch (weekend = brunch)
- 5pm–8pm → dinner
- 8pm+ → late_night, formality_bias +0.2
- Guest count: 2→intimate, 3–6→small, 7–12→medium, 13+→large

---

### Stage 3 — Constraint Extractor

File: `stages/constraint-extractor.ts`
Model: `ANTHROPIC_MODEL_FAST` (Haiku)
Method: Think Tool first, then `tool_use` structured output
Input: dealbreaker output + ImplicitContext + raw preferences
Output: `StructuredConstraint[]` — writes to `structured_constraints` table

Cuisine preferences as weighted map `{ cuisine: 0.0–1.0 }`
Budget in cents
Apply `weight_multiplier` from invitations table row

---

### Stage 4 — Gemini Maps Grounding

File: `adapters/gemini.ts`
Model: Gemini Flash with google_maps grounding
Input: `StructuredConstraint[]`, locationHint string
Output: enriched restaurant candidates (same shape as existing Places adapter)

Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
Grounding: `tools: [{ google_maps: {} }]`
Error: throw descriptive error if GEMINI_API_KEY missing

---

### Stage 5 — Menu Phantom

File: `stages/menu-phantom.ts`
Input: restaurant candidates + `StructuredConstraint[]`
Output: candidates with `dietary_analysis` populated

Tier 1: parse Google AI review summary for dietary keywords
Tier 2: only if Tier 1 ambiguous AND hard blocker exists — fetch /menu page
Tier 3: only if Tiers 1+2 fail AND hard blocker exists — Gemini Flash vision
  on up to 3 menu photos, 1–10 rating per dietary category
Always check `restaurant_cache` first (30-day TTL)
Log which tier was used

---

### Stage 6 — Deterministic Scorer

File: `stages/deterministic-scorer.ts`
Method: Pure TypeScript, synchronous
Input: enriched candidates + `StructuredConstraint[]`
Output: `RestaurantScore[]`

Weights: dietary 0.30, budget 0.25, cuisine 0.20, location 0.15, review 0.10
Hard filter: disqualify if any hard-blocker guest has `dietary_score < 1.0`
Set `disqualify_reason` string when disqualifying

---

### Stage 7 — Vibe Embedder

File: `stages/vibe-embedder.ts`
SDK: `voyageai`, model `voyage-3`
Input: non-disqualified `RestaurantScore[]` + `StructuredConstraint[]`
Output: same list with `vibeMatchScore` added

Embed restaurant review summaries + attributes as `inputType: "document"`
Embed group vibe query string as `inputType: "query"`
Cosine similarity for `vibeMatchScore`
Upsert embeddings to `restaurant_cache.vibe_embedding`

---

### Stage 8 — Cohere Reranker

File: `stages/reranker.ts`
SDK: `cohere-ai` v2, model `rerank-v3.5`
Input: `RestaurantScore[]` (top ~15 by composite) + `StructuredConstraint[]`
Output: top 5 `RestaurantScore[]` after rerank

Build `enrichedDescription` per restaurant: name + cuisine + review summary + dietary scores + price tier
Build reranker query from full constraint profile via `buildRerankerQuery()` helper

---

### Stage 9 — Fairness Checker

File: `stages/fairness-checker.ts`
Method: Pure TypeScript, synchronous
Input: top 5 `RestaurantScore[]` + `StructuredConstraint[]`
Output: same list with `envy_scores` map and `warnings` annotated

Envy formula:
```typescript
function computeEnvyScore(guest: StructuredConstraint, restaurant: RestaurantScore): number {
  let envy = 0;
  if (guest.intensity_tier === 'hard') {
    envy = restaurant.dietary_score < 1.0 ? 1.0 : 0;
  }
  const budgetGap = Math.max(0, restaurant.priceLevel - guest.budget_max) / guest.budget_max;
  envy += budgetGap * 0.5;
  envy += (1 - restaurant.vibeMatchScore) * 0.3;
  return Math.min(envy, 1.0);
}
```

Flag: envy > 0.7 → add to warnings array with reason string
Annotate only — do not filter

---

### Stage 10 — Reasoning Engine

File: `stages/reasoning-engine.ts`
Model: `ANTHROPIC_MODEL_REASONING` (Sonnet) with extended thinking `budget_tokens: 5000`
Method: `tool_use`
Input: fairness-annotated top 5 + `StructuredConstraint[]` + `ImplicitContext`
Output: 3 proposals (ProposalWithNarrative without narratives yet)

Tool name: `submit_proposals`
Schema: proposals array maxItems 3, each with place_id, rank, reasoning,
  constraints_met, constraints_gap, fairness_note; plus group_summary,
  conflicts_resolved
Guest IDs in prompt: use guest_0/guest_1/etc. — never real names
Include fairness warnings in prompt for any envy > 0.7
System prompt lives in `prompts/reasoning-system.ts`

---

### Stage 11 — Critic Verifier

File: `stages/critic-verifier.ts`
Model: `ANTHROPIC_MODEL_FAST` (Haiku)
Method: `tool_use`
Input: 3 proposals + original `StructuredConstraint[]` + full reranked top 5
Output: verified 3 proposals (with swaps if needed)

System prompt in `prompts/critic-system.ts`
Check 4 things: hard dietary accommodation, price realism, factual claims, overlooked candidates
On hard failure: swap in next candidate from reranked list, re-run reasoning for that slot only
No hard failure: return proposals unchanged

---

### Stage 12 — Narrative Generator

File: `stages/narrative-generator.ts`
Model: `ANTHROPIC_MODEL_FAST` (Haiku)
Method: `tool_use`
Input: verified proposals + `StructuredConstraint[]`
Output: proposals with `narrative_group` and `narrative_personal` populated

Tool output schema: `{ group: string, personal: { [guest_id]: string } }` per proposal
Group: 2-3 sentences, positive, zero individual attribution
Personal: references specific guest's constraints being met
System prompt in `prompts/narrative-system.ts`
Privacy rule (include verbatim in system prompt):
  "NEVER reveal one guest's preferences to another. The group narrative must
   not contain any information that would let Guest A infer Guest B's specific
   dietary restriction or budget."

---

## Orchestrator (pipeline/orchestrator.ts)

```typescript
export async function runPipeline(eventId: string): Promise<PipelineResult> {
  const startTime = Date.now();
  const { preferences, event } = await loadEventData(eventId);

  // Track B: sequential preference processing
  const dealbreakers = await dealbreakerDetector.run(preferences);
  const implicit = implicitInference.run(event);
  const constraints = await constraintExtractor.run(preferences, dealbreakers, implicit);

  // Track A: parallel data enrichment (starts after constraints ready)
  const [mapsCandidates, placesSummaries] = await Promise.all([
    geminiMapsGrounding.run(constraints, event.location_hint),
    fetchPlacesAISummaries(event.location_hint, constraints),
  ]);

  const allCandidates = mergeCandidates(mapsCandidates, placesSummaries);
  const enrichedCandidates = await menuPhantom.enrich(allCandidates, constraints);
  const scored = deterministicScorer.score(enrichedCandidates, constraints);
  const qualified = scored.filter(s => !s.disqualified);
  const withVibes = await vibeEmbedder.run(qualified, constraints);
  const top5 = await reranker.run(withVibes, constraints);
  const fairnessAnnotated = fairnessChecker.run(top5, constraints);
  const proposals = await reasoningEngine.run(fairnessAnnotated, constraints, implicit);
  const verified = await criticVerifier.run(proposals, constraints);
  const withNarratives = await narrativeGenerator.run(verified, constraints);

  await aiLogger.logPipelineRun(eventId, withNarratives, Date.now() - startTime);
  return withNarratives;
}
```

---

## Cost Tracker (utils/cost-tracker.ts)

```typescript
// review quarterly — provider prices change
const PRICING = {
  'claude-haiku-4-5':    { input: 0.80,  output: 4.00  },  // per MTok
  'claude-sonnet-4-6':   { input: 3.00,  output: 15.00 },
  'gemini-2.5-flash':    { input: 0.075, output: 0.30  },
  'voyage-3':            { input: 0.06,  output: 0     },
  'cohere-rerank-v3.5':  { perRequest: 0.002            },  // $2/1000
};
```

---

## Logger (utils/logger.ts)

```typescript
interface LogStageParams {
  eventId: string;
  stage: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  rawInput: unknown;
  rawOutput: unknown;
  error?: string;
}

// input_hash: SHA256 of JSON.stringify(rawInput)
// cost_micros: computed from PRICING map * token counts
async function logStage(params: LogStageParams): Promise<void>
```

---

## Cache (utils/cache.ts)

```typescript
// Returns null if not cached or TTL expired (> 30 days)
async function getCachedRestaurant(placeId: string): Promise<RestaurantCacheRow | null>

// Upserts by place_id, resets last_analyzed to now()
async function setCachedRestaurant(placeId: string, analysis: Partial<RestaurantCacheRow>): Promise<void>
```

---

## Feature Flag + Rollback

In `apps/web/app/api/events/[id]/trigger/route.ts`:

```typescript
const USE_PIPELINE_V2 = process.env.PIPELINE_V2 === 'true';

if (USE_PIPELINE_V2) {
  result = await runPipeline(eventId);
} else {
  result = await legacyClaudeAdapter.synthesize(preferences, restaurants);
}
```

`PIPELINE_V2=false` is the default. Changing to false + redeploying is the
full rollback. New DB tables and columns are additive — legacy adapter ignores them.

---

## Code Conventions

### Comments
- Write WHY, never WHAT
- Bad: `// increment counter`
- Good: `// wrap at 255 to match register limit`
- Never: separator lines `//===`, section banners `// === Setup ===`
- Never: restatements of function names above the function
- When in doubt, omit the comment

### AI calls
- Always use `tool_use` for structured output — never assistant prefill
- Always log to `ai_logs` via `utils/logger.ts`
- Always use env vars for model names, never hardcode model strings
- Always add retry logic on external API calls (2 retries, 1s backoff)

### General
- Stage classes export a `run()` method
- Synchronous stages (implicit-inference, deterministic-scorer,
  fairness-checker) must not be async
- All budget values in cents (not dollars)
- Guest references in prompts use guest_0/guest_1/etc. — never real names

---

## Session Tracking

Update the line below at the end of each session.

```
Current session: [UPDATE THIS]
```

### Session log

- [x] Session 1: Skeleton + DB migration (009)
- [x] Pre-S3: Migration 010, withRetry util, @groupplan/ai type-check
- [x] Session 2: Track B — dealbreaker, implicit inference, constraint extractor
- [x] Session 3: Track A — Gemini Maps grounding, Menu Phantom Tier 1, cache
- [x] Session 4: Deterministic scoring stack
- [x] Session 5: Vibe embedder (Voyage AI), deterministic reranker, fairness checker
- [x] Session 6: Orchestrator wiring, reasoning engine, critic verifier, narrative generator, PIPELINE_V2 flag
- [x] Session 7: Production hardening — RPC v2 columns, RLS docs, critic fill, rating guards, cuisine word-token matching
- [x] Session 8: Full integration test suite (23 integration tests, data integrity checks)
- [x] Session 8.5: Privacy hardening — anonymized envy_scores keys in all Anthropic prompts
- [x] Phase 5: Monitoring + cost circuit breaker (HTTP 402 on monthly spend >= PIPELINE_COST_CAP_MICROS)
- [x] QA visual regression suite — 48 Playwright tests, 12 pages × 2 viewports × 2 themes (qa-runner/)

### Decisions log

- `tool_use` for all AI structured output — never assistant prefill
- `safeLogStage()` by default; `logStage()` only when DB failure must propagate
- Model names always from env vars — never hardcoded strings in code
- Budget values always in cents, not dollars
- Guest references in prompts: `guest_0`/`guest_1`/etc — never real names or invitation IDs
- `anonymizeGuestKeys()` applied before any guest-keyed data enters an Anthropic prompt
- Gemini `place_id` values are model-generated slugs, not canonical Google Maps IDs
- Scorer is intentionally conservative: disqualifies only on hard cuisine avoidance or severe budget violation
- Fairness warnings are uncertainty/context signals — not rejection signals
- Reranker is deterministic (Cohere deferred — still produces good results)
- Critic verifier removes failing proposals; swap-and-rerun is deferred
- `constraint_coverage` not persisted to DB — pipeline-internal only
- Extended thinking is opt-in via `ANTHROPIC_EXTENDED_THINKING=false` (default)
- `allowedFunctionNames` (camelCase) required in Gemini REST `toolConfig` — fixed Session 8
