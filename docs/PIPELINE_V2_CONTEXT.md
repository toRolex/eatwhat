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

## Current Codebase State (as of Session 7)

### Packages

```
packages/
├── ai/          @groupplan/ai    — Pipeline v2 implementation (active)
├── venues/      @groupplan/venues — Google Places + Yelp fetching
├── notifications/ @groupplan/notifications
├── calendar/    @groupplan/calendar
└── db/          @groupplan/db    — Supabase client + typed queries
```

### App routes (apps/web)

```
app/api/events/[id]/trigger/route.ts   ← pipeline entry point; PIPELINE_V2 flag added
app/api/events/
app/events/
app/invite/
```

### Supabase tables (original + v2 additions)

```
events          — event metadata, host, location_hint, proposed_date
invitations     — guest RSVPs linked to events
guest_preferences — structured preference input per guest (dietary[], cuisine_prefs[], notes, etc.)
restaurants     — cached Places/Yelp results (legacy)
proposals       — AI-generated ranked proposals (extended with v2 columns via migration 009)
votes           — guest votes on proposals
users           — auth table
ai_logs         — pipeline stage observability (added migration 009)
structured_constraints — per-guest structured output from constraint-extractor (added 009 + 010)
restaurant_cache — vibe embeddings + dietary analysis cache (added migration 009)
```

### Legacy AI adapter (packages/ai/src/adapters/claude.ts)

Single-shot pattern — takes raw preferences + restaurant list, returns 3
ranked proposals via assistant prefill JSON hack. **Do not delete** — stays
behind `PIPELINE_V2=false`. All v2 stages use `tool_use` only.

---

## Actual packages/ai directory layout (Sessions 1–6 complete)

```
packages/ai/
├── src/
│   ├── pipeline/
│   │   ├── orchestrator.ts        — runPipeline(), injectable loader, IMPLEMENTED
│   │   ├── parallel-runner.ts     — Promise.all wrapper
│   │   └── types.ts               — all shared interfaces (see section below)
│   ├── stages/
│   │   ├── dealbreaker-detector.ts    — IMPLEMENTED (tool_use, Haiku)
│   │   ├── implicit-inference.ts      — IMPLEMENTED (pure TS, synchronous)
│   │   ├── constraint-extractor.ts    — IMPLEMENTED (tool_use, Haiku, DB write)
│   │   ├── deterministic-scorer.ts    — IMPLEMENTED (pure TS, synchronous)
│   │   ├── vibe-embedder.ts           — IMPLEMENTED (Voyage AI REST, cosine sim)
│   │   ├── reranker.ts                — IMPLEMENTED (deterministic; Cohere deferred)
│   │   ├── fairness-checker.ts        — IMPLEMENTED (pure TS, synchronous)
│   │   ├── reasoning-engine.ts        — IMPLEMENTED (Sonnet + extended thinking)
│   │   ├── critic-verifier.ts         — IMPLEMENTED (Haiku, simplified — no swap/rerun yet)
│   │   └── narrative-generator.ts     — IMPLEMENTED (Haiku, privacy rule enforced)
│   ├── adapters/
│   │   ├── anthropic.ts           — stub (unused in v2 path)
│   │   ├── gemini.ts              — IMPLEMENTED (function calling; NOT google_maps grounding)
│   │   ├── cohere.ts              — stub (Cohere reranker deferred to Session 7)
│   │   ├── voyage.ts              — stub (direct REST used instead in vibe-embedder)
│   │   └── yelp-ai.ts             — stub
│   ├── prompts/
│   │   ├── dealbreaker.ts         — stub (prompt is inlined in stage)
│   │   ├── constraint-extraction.ts — stub (prompt is inlined in stage)
│   │   ├── reasoning-system.ts    — IMPLEMENTED
│   │   ├── critic-system.ts       — IMPLEMENTED
│   │   └── narrative-system.ts    — IMPLEMENTED
│   ├── utils/
│   │   ├── logger.ts              — IMPLEMENTED (safeLogStage + logStage)
│   │   ├── cost-tracker.ts        — IMPLEMENTED
│   │   ├── cache.ts               — IMPLEMENTED (getCachedRestaurant/setCachedRestaurant)
│   │   └── retry.ts               — IMPLEMENTED (shared withRetry utility)
│   └── interface.ts               — legacy AIProvider interface (kept for claude.ts)
├── package.json
└── tsconfig.json
```

---

## TypeScript Interfaces (actual state of pipeline/types.ts after Session 6)

```typescript
export interface PipelineResult {
  eventId: string;
  proposals: ProposalWithNarrative[];
  groupSummary: string;
  conflictsResolved: string[];
  totalLatencyMs: number;
  totalCostMicros: number;
  candidateDetails: Record<string, CandidateDetail>; // place_id → restaurant info
}

export interface CandidateDetail {
  name: string;
  address: string;
  cuisine_types: string[];
  price_range: string;
  rating: number;
  review_summary: string;
  image_url?: string;
  maps_url?: string;
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

export interface ImplicitInferenceResult {
  context: ImplicitContext;
  inferred: ConstraintItem[];   // keyword-derived inferred constraints
}

export interface StructuredConstraint {
  guest_id: string;
  invitation_id: string;
  event_id: string;
  dietary_hard: string[];
  dietary_soft: string[];
  cuisine_likes: Record<string, number>;  // { "italian": 0.9 }
  cuisine_avoids: string[];
  budget_min: number;           // cents
  budget_max: number;           // cents (999999 = unconstrained)
  vibe_tags: string[];
  dealbreaker_flags: string[];
  intensity_tier: 'hard' | 'strong' | 'soft' | 'inferred';  // 4 values — inferred added in S2
  weight_multiplier: number;    // default 1.0
  raw_text: string;
  items?: ConstraintItem[];     // intermediate Track B representation
}

export type ConstraintStrength = 'hard' | 'soft' | 'inferred' | 'unknown';

export interface ConstraintItem {
  id: string;
  category: 'dietary' | 'allergy' | 'budget' | 'location' | 'time' | 'cuisine'
          | 'accessibility' | 'ambiance' | 'service_speed' | 'other';
  strength: ConstraintStrength;
  value: string;
  sourceText?: string;
  confidence: number;
  reason?: string;
}

// Data provenance for menu/dietary signals
export type DataSource = 'grounded' | 'inferred' | 'unknown';

export interface DietarySignal {
  source: DataSource;
  confidence: number;   // 0.0–1.0
  evidence?: string;    // short explanation, if known
}

// Keys: dietary categories ('vegetarian', 'vegan', 'gluten_free', etc.)
export type DietaryAnalysis = Record<string, DietarySignal>;

// Output of Gemini grounding + Menu Phantom enrichment
export interface EnrichedCandidate {
  place_id: string;        // WARNING: model-generated slug, NOT a canonical Google Maps ID
  name: string;
  address: string;
  cuisine_types: string[];
  price_range: string;     // '$' | '$$' | '$$$' | '$$$$'
  rating: number;          // 0–5
  review_count: number;
  review_summary: string;
  dietary_analysis: DietaryAnalysis;
  enrichment_tier: 1 | 2 | 3;  // Menu Phantom tier used (only 1 is operational)
  image_url?: string;
  maps_url?: string;
}

export interface RestaurantScore {
  place_id: string;
  name: string;
  review_summary: string;
  dietary_score: number;
  budget_score: number;
  cuisine_score: number;
  location_score: number;        // 0.5 placeholder — real scoring deferred
  review_score: number;
  composite: number;
  vibeMatchScore: number;        // 0.0 placeholder until vibe-embedder runs; 0.3 if no review text
  disqualified: boolean;
  disqualify_reason?: string;
  enrichedDescription: string;   // populated by scorer for reranker use
  dietaryAnalysis: Record<string, number>;  // category → numeric score (not DietarySignal)
  priceLevel: number;            // estimated cents; 0 = unknown price
  confidence: number;            // 0.0–1.0
  penalties: string[];           // explanation fragments
  bonuses: string[];             // explanation fragments
  constraintMatchSummary: string;
  envy_scores?: Record<string, number>;    // guest_id → 0.0–1.0, set by fairness-checker
  fairness_warnings?: string[];            // set by fairness-checker
}

export interface EnvyScore {
  restaurant_id: string;
  envy_scores: Record<string, number>;
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
  narrative_group: string;              // populated by narrative-generator
  narrative_personal: Record<string, string>;  // guest_id → personal narrative
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

## Database Schema

### Migration 009 — `supabase/migrations/009_ai_pipeline.sql`

```sql
CREATE EXTENSION IF NOT EXISTS vector;

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
  invitation_id   UUID NOT NULL UNIQUE REFERENCES invitations(id) ON DELETE CASCADE,
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

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS envy_scores JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS constraint_coverage JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS narrative_group TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS narrative_personal JSONB;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE structured_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_cache ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS policies not yet defined — deferred to Session 7
```

### Migration 010 — `supabase/migrations/010_add_structured_constraint_columns.sql`

Added in pre-Session-3 stabilization pass. Extends `structured_constraints`:

```sql
ALTER TABLE structured_constraints
  ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE structured_constraints
  ADD COLUMN IF NOT EXISTS weight_multiplier FLOAT DEFAULT 1.0;

-- Idempotent UNIQUE guard (for environments that applied 009 before UNIQUE was added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'structured_constraints_invitation_id_key'
  ) THEN
    ALTER TABLE structured_constraints
      ADD CONSTRAINT structured_constraints_invitation_id_key UNIQUE (invitation_id);
  END IF;
END $$;
```

### database.types.ts

**Not yet regenerated** — proposals table v2 columns (`envy_scores`, `narrative_group`, `narrative_personal`, `confidence_score`) exist in the DB but are not in the TypeScript types. Session 7 must regenerate types before writing those fields from the trigger route.

---

## Environment Variables

```bash
# Existing (legacy path)
ANTHROPIC_API_KEY=
GOOGLE_PLACES_API_KEY=
YELP_API_KEY=

# Required for pipeline v2
GEMINI_API_KEY=
GEMINI_MODEL=                    # e.g. gemini-2.0-flash-exp
COHERE_API_KEY=                  # required when Cohere reranker is added (Session 7)
VOYAGE_API_KEY=
VOYAGE_MODEL=                    # e.g. voyage-3
ANTHROPIC_MODEL_REASONING=claude-sonnet-4-6
ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001
PIPELINE_LOG_LEVEL=info          # set to 'debug' to log raw AI payloads (PII risk)
PIPELINE_V2=false                # set to 'true' to enable v2 path
```

---

## Stage Specifications (as implemented through Session 6)

### Stage 1 — Dealbreaker Detector ✅

File: `stages/dealbreaker-detector.ts`  
Export: `dealbreakerDetector = { run }`  
Model: `ANTHROPIC_MODEL_FAST` (Haiku)  
Method: `tool_use` with `classify_constraints` tool, `tool_choice: { type: 'tool' }`  
Input: `{ guest_id: string, raw_text: string }[]`  
Output: `{ guest_id: string, items: ConstraintItem[] }[]`

Classification rules (escalate on uncertainty):
- "I'm allergic" / medical context → `hard`, category `allergy`, confidence ≥ 0.9
- "I don't eat" / firm budget → `hard`, category `dietary`, confidence ≥ 0.85
- "I'd prefer" / "I like" → `soft`
- Contextual signals → `inferred`

Constraint IDs are prefixed with `guest_N_` (e.g., `guest_0_c1`) to enable
per-guest filtering. Retry: 2 retries, 1s backoff, 429 only. Logging: `safeLogStage`.

---

### Stage 2 — Implicit Inference ✅

File: `stages/implicit-inference.ts`  
Export: `implicitInference = { run }`  
Method: Pure TypeScript, **synchronous**, zero API calls  
Input: `EventRecord { id, title, event_date, guest_count }`  
Output: `ImplicitInferenceResult { context: ImplicitContext, inferred: ConstraintItem[] }`

Signal rules:
- "birthday"/"bday" → celebration, formality_bias +0.3, ambiance=celebratory item
- "team"/"standup"/"offsite" → work, formality_bias +0.5, ambiance=professional item
- "date night" / "romantic" → date, formality_bias +0.2, ambiance=romantic item
- 10:00–13:00 → lunch (Sat/Sun = brunch); 17:00–19:00 → dinner; 20:00+ → late_night
- guest_count: 2→intimate, 3–6→small, 7–12→medium, 13+→large
- All inferred items have `strength: 'inferred'` — never `'hard'`

---

### Stage 3 — Constraint Extractor ✅

File: `stages/constraint-extractor.ts`  
Export: `constraintExtractor = { run }`  
Model: `ANTHROPIC_MODEL_FAST` (Haiku)  
Method: `tool_use` with `extract_constraints` tool  
Input: `RawPreference[]`, `DealbreakerOutput[]`, `ImplicitInferenceResult`  
Output: `StructuredConstraint[]` — also **writes to `structured_constraints` table (fatal on failure)**

`RawPreference { guest_id, invitation_id, event_id, raw_text, weight_multiplier? }`

Budget output: always in cents. Guest refs in prompt: `guest_0`, `guest_1`, etc.
DB upsert: `onConflict: 'invitation_id'`. Retry: 2 retries, 1s, 429 only.

---

### Stage 4 — Gemini Restaurant Discovery ✅

File: `adapters/gemini.ts`  
Export: `geminiMapsGrounding` (bare function) + `geminiAdapter = { run: geminiMapsGrounding }`  
Method: **Gemini function calling** via `fetch` to Gemini REST API — NOT `google_maps` grounding  
Input: `locationHint: string`, `constraints: StructuredConstraint[]`  
Output: `EnrichedCandidate[]` (with empty `dietary_analysis: {}`, `enrichment_tier: 1`)

**Critical:** `place_id` values in output are **model-generated slugs, not canonical Google Maps
Place IDs**. Treat as session-local opaque handles. Do not assume they are stable,
verifiable, or merge-safe across runs.

Env: `GEMINI_API_KEY`, `GEMINI_MODEL`. Retry: 2 retries, 1s, 429. `safeLogStage`.

---

### Stage 5 — Menu Phantom ✅ (Tier 1 only)

File: `stages/menu-phantom.ts`  
Export: `menuPhantom` (bare function alias for `enrich`) + `enrich`  
Input: `EnrichedCandidate[]`, `StructuredConstraint[]`  
Output: same array with `dietary_analysis` populated

**Tier 1 (implemented):** Keyword analysis of `candidate.review_summary`.
- High-confidence phrases (e.g., "certified halal") → `{ source: 'inferred', confidence: 0.85 }`
- Low-confidence keywords → `{ source: 'inferred', confidence: 0.6 }`
- Not mentioned → `{ source: 'unknown', confidence: 0 }`
- **`source: 'grounded'` is NEVER set by Tier 1** — reserved for verified external data
- Only analyzes categories that match a guest's actual dietary constraints

**Tier 2 / Tier 3:** Stubs that throw `PipelineError('menu-phantom-tierN', not implemented)`.

Cache-first: checks `restaurant_cache` per candidate. Cache writes are non-fatal. `safeLogStage`.

---

### Stage 6 — Deterministic Scorer ✅

File: `stages/deterministic-scorer.ts`  
Export: `deterministicScorer = { score }` (object with score method)  
Method: Pure TypeScript, **synchronous**  
Input: `EnrichedCandidate[]`, `StructuredConstraint[]`  
Output: `RestaurantScore[]` sorted by composite DESC, disqualified last

**Scoring weights:**
```
dietary 0.30 | budget 0.25 | cuisine 0.20 | location 0.15 | review 0.10
```

**Disqualification conditions (intentionally conservative):**
1. Guest has `intensity_tier: 'hard'` AND `cuisine_avoids` entry matches candidate `cuisine_types`
2. Candidate estimated price exceeds ALL hard-budget guests' `budget_max` by >50%

**Unknown dietary → confidence penalty only, never disqualification.**
Dietary signal scoring: grounded ≥ 0.9 → 1.0 | inferred ≥ 0.75 → 0.7 | unknown → 0.3.

`location_score = 0.5` placeholder. `vibeMatchScore = 0.0` placeholder. `safeLogStage`.

---

### Stage 7 — Vibe Embedder ✅

File: `stages/vibe-embedder.ts`  
Export: `vibeEmbedder = { run }`  
Method: Voyage AI REST API via `fetch` (no `voyageai` SDK)  
Input: `RestaurantScore[]` (non-disqualified), `StructuredConstraint[]`  
Output: same array with `vibeMatchScore` populated (0.0–1.0)

Cache-first: checks `restaurant_cache.vibe_embedding` per candidate. Cache writes non-fatal.
Batch embeds documents (review summaries) in one API call, embeds vibe query separately.
Candidates with empty `review_summary` → `vibeMatchScore: 0.3` (neutral-low, no API call).
Cosine similarity, clamped to [0, 1]. `safeLogStage`. Env: `VOYAGE_API_KEY`, `VOYAGE_MODEL`.

---

### Stage 8 — Reranker ✅ (deterministic; Cohere deferred)

File: `stages/reranker.ts`  
Export: `reranker = { run }`  
Method: **Deterministic sort** — Cohere API integration deferred to Session 7  
Input: `RestaurantScore[]` (vibe-scored), `StructuredConstraint[]`  
Output: top 5 `RestaurantScore[]` by rerank score

Rerank score formula: `composite * 0.50 + confidence * 0.25 + vibeMatchScore * 0.25`

**Authority order is absolute:** disqualified candidates are excluded from output
(orchestrator already filters them before this stage). Remaining sorted by rerank score DESC,
top 5 returned. `safeLogStage`.

---

### Stage 9 — Fairness Checker ✅

File: `stages/fairness-checker.ts`  
Export: `fairnessChecker = { run }`  
Method: Pure TypeScript, **synchronous**  
Input: top 5 `RestaurantScore[]`, `StructuredConstraint[]`  
Output: same list with `envy_scores` and `fairness_warnings` populated on each candidate

Envy formula (as implemented, with guards):
```typescript
function computeEnvyScore(guest, restaurant): number {
  let envy = 0;
  if (guest.intensity_tier === 'hard') {
    envy = restaurant.dietary_score < 1.0 ? 1.0 : 0;
  }
  // Guard: priceLevel === 0 means unknown price, not "free" — skip budget envy
  if (restaurant.priceLevel !== 0 && guest.budget_max > 0 && guest.budget_max < 999999) {
    const budgetGap = Math.max(0, restaurant.priceLevel - guest.budget_max) / guest.budget_max;
    envy += budgetGap * 0.5;
  }
  envy += (1 - restaurant.vibeMatchScore) * 0.3;
  return Math.min(envy, 1.0);
}
```

**Warning threshold:** envy > 0.7 → adds warning string (uses `guest_0`/`guest_1` — never real IDs).

**Important:** With Tier 1 data, `dietary_score` rarely reaches 1.0 (inferred max ~0.7), so
warnings will be frequent. This is **intentional** — warnings are uncertainty/context signals
for the reasoning engine, not disqualification signals. `safeLogStage`.

---

### Stage 10 — Reasoning Engine ✅

File: `stages/reasoning-engine.ts`  
Export: `reasoningEngine = { run }`  
Model: `ANTHROPIC_MODEL_REASONING` (Sonnet) with extended thinking `budget_tokens: 5000`  
Method: `tool_use` with `submit_proposals` tool  
Input: fairness-annotated `RestaurantScore[]`, `StructuredConstraint[]`, `ImplicitInferenceResult`  
Output: `ProposalWithNarrative[]` (3 proposals; `narrative_group` and `narrative_personal` empty — filled by narrative-generator)

Beta: `betas: ['interleaved-thinking-2025-05-14']` — verify against Anthropic docs before production.  
`max_tokens: 16000`. Retry: 2 retries. Guest IDs in prompt: `guest_0`/`guest_1`/etc.  
Fairness warnings treated as data uncertainty context, not rejection signals. `safeLogStage`.

---

### Stage 11 — Critic Verifier ✅ (simplified)

File: `stages/critic-verifier.ts`  
Export: `criticVerifier = { run }`  
Model: `ANTHROPIC_MODEL_FAST` (Haiku)  
Method: `tool_use` with `verify_proposals` tool  
Input: `ProposalWithNarrative[]`, `StructuredConstraint[]`, `RestaurantScore[]` (full top-N)  
Output: verified `ProposalWithNarrative[]` (failing proposals removed)

**Session 7 deferred:** Swap-and-rerun (replacing a failing proposal with the next candidate
and re-running reasoning for that slot) is not yet implemented. Failing proposals are simply
removed. Throws `PipelineError` if all proposals fail. `safeLogStage`.

---

### Stage 12 — Narrative Generator ✅

File: `stages/narrative-generator.ts`  
Export: `narrativeGenerator = { run }`  
Model: `ANTHROPIC_MODEL_FAST` (Haiku)  
Method: `tool_use` with `generate_narratives` tool  
Input: verified `ProposalWithNarrative[]`, `StructuredConstraint[]`  
Output: proposals with `narrative_group` and `narrative_personal` populated

Group narrative: 2–3 sentences, no individual attribution, uses "reviews suggest"/"appears to
offer" language — never "definitely has" or "verified to offer".

Personal narratives: `guest_0`/`guest_1` keys from the model are remapped to real `guest_id`
values before return (using constraints array index).

Privacy rule (verbatim in system prompt):  
"NEVER reveal one guest's preferences to another. The group narrative must not contain
any information that would let Guest A infer Guest B's specific dietary restriction or budget."

`safeLogStage`.

---

## Orchestrator (actual implementation)

```typescript
// Injectable loader for testability
type EventDataLoader = (eventId: string) => Promise<LoadedEventData>;

export async function runPipeline(
  eventId: string,
  options?: { loader?: EventDataLoader; locationHint?: string },
): Promise<PipelineResult> {
  const startTime = Date.now();
  const loader = options?.loader ?? defaultLoader;
  const { event, preferences } = await loader(eventId);
  const locationHint = options?.locationHint ?? event.location_hint;

  // Track B — sequential preference processing
  const dealbreakerInputs = preferences.map(p => ({ guest_id: p.guest_id, raw_text: p.raw_text }));
  const dealbreakers = await dealbreakerDetector.run(dealbreakerInputs);
  const implicit = implicitInference.run(event);
  const constraints = await constraintExtractor.run(preferences, dealbreakers, implicit);

  // Track A — Gemini candidate discovery (fetchPlacesAISummaries not yet implemented)
  const mapsCandidates = await geminiMapsGrounding(locationHint, constraints);

  // Build candidateDetails before reranking drops some
  const candidateDetails: Record<string, CandidateDetail> = {};
  for (const c of mapsCandidates) { candidateDetails[c.place_id] = { ...c }; }

  const enrichedCandidates = await menuPhantom(mapsCandidates, constraints);
  const scored = deterministicScorer.score(enrichedCandidates, constraints);
  const qualified = scored.filter(s => !s.disqualified);
  if (qualified.length === 0) {
    throw new PipelineError('orchestrator', new Error('all candidates were disqualified'));
  }

  const withVibes = await vibeEmbedder.run(qualified, constraints);
  const top5 = await reranker.run(withVibes, constraints);
  const fairnessAnnotated = fairnessChecker.run(top5, constraints);
  const proposals = await reasoningEngine.run(fairnessAnnotated, constraints, implicit);
  const verified = await criticVerifier.run(proposals, constraints, top5);
  const withNarratives = await narrativeGenerator.run(verified, constraints);

  return {
    eventId,
    proposals: withNarratives,
    groupSummary: withNarratives[0]?.narrative_group ?? '',
    conflictsResolved: [],
    totalLatencyMs: Date.now() - startTime,
    totalCostMicros: 0,  // deferred to Session 7
    candidateDetails,
  };
}
```

`defaultLoader` queries Supabase directly (event + invitations + guest_preferences) and
builds `RawPreference[]` by concatenating structured preference fields into `raw_text`.
Uses `invitation.id` as `guest_id` since `user_id` is nullable on invitations.

---

## Feature Flag + Rollback

In `apps/web/app/api/events/[id]/trigger/route.ts` (as implemented):

```typescript
if (process.env.PIPELINE_V2 === 'true') {
  const pipelineResult = await runPipeline(id, { locationHint: location });
  // maps pipelineResult.candidateDetails[place_id] → proposal DB rows
  // ... persists proposals, sends notifications, returns { ok: true, pipeline: 'v2' }
  return NextResponse.json({ ok: true, emails: emailSummary, pipeline: 'v2' });
}
// Legacy path continues below — unchanged
```

`PIPELINE_V2=false` (default) preserves the legacy `ClaudeAIProvider` path exactly.
V2 proposal rows do NOT yet write `envy_scores`/`narrative_personal`/`confidence_score`
to the DB (deferred to Session 7 after `database.types.ts` regeneration).

---

## Logger (utils/logger.ts)

```typescript
interface LogStageParams {
  eventId: string;  stage: string;  provider: string;  model: string;
  inputTokens: number;  outputTokens: number;  latencyMs: number;
  rawInput: unknown;  rawOutput: unknown;  error?: string;
}

// Fire-and-forget — use this by default. Never fails the caller.
export function safeLogStage(params: LogStageParams): void

// Throws on DB failure — only use when logging failure should propagate.
export async function logStage(params: LogStageParams): Promise<void>
```

`raw_input`/`raw_output` only written to DB when `PIPELINE_LOG_LEVEL=debug` (PII risk).
`input_hash` (SHA256) always written.

---

## Cache (utils/cache.ts)

```typescript
// Returns null if not cached or TTL expired (> ttl_days days)
export async function getCachedRestaurant(placeId: string): Promise<RestaurantCacheRow | null>

// Upserts by place_id, resets last_analyzed to now()
export async function setCachedRestaurant(placeId: string, analysis: Partial<RestaurantCacheRow>): Promise<void>
```

---

## Code Conventions

### Comments
- Write WHY, never WHAT. When in doubt, omit.

### AI calls
- Always use `tool_use` for structured output — never assistant prefill
- Always log to `ai_logs` via `utils/logger.ts`; use `safeLogStage` by default
- Always use env vars for model names, never hardcode model strings
- Always wrap external API calls with `withRetry` from `utils/retry.ts`
- Budget values always in cents; guest IDs in prompts always `guest_0`/`guest_1`/etc.

### Privacy rule — external AI calls (enforced, non-negotiable)
**External AI provider calls (Anthropic, Gemini, Voyage) must never include real guest IDs, invitation IDs, user IDs, emails, names, or any internal UUID unless explicitly documented as an exception.**
- Use `anonymizeGuestKeys(map, constraints)` when passing any map keyed by guest_id (e.g., `envy_scores`) into a prompt or request body.
- Use `sanitizeProposalsForPrompt(proposals, constraints)` when serializing `ProposalWithNarrative[]` for an AI stage.
- New fields added to `ProposalWithNarrative` or `RestaurantScore` that contain guest references must be explicitly anonymized before entering any prompt.

### Stage exports
- Stages that the orchestrator calls as `.run()` export `{ run }` objects:
  `dealbreakerDetector`, `implicitInference`, `constraintExtractor`, `deterministicScorer = { score }`,
  `vibeEmbedder`, `reranker`, `fairnessChecker`, `reasoningEngine`, `criticVerifier`, `narrativeGenerator`
- `geminiMapsGrounding` is a bare function (also aliased as `geminiAdapter.run`)
- `menuPhantom` is a bare function alias for `enrich`

### Synchronous stages (must not be async)
`implicit-inference`, `deterministic-scorer`, `fairness-checker`

---

## Production Readiness

**Pipeline v2 is ready for controlled production deployment (247/247 tests, privacy hardening complete).**

See `docs/PIPELINE_V2_DEPLOYMENT_CHECKLIST.md` for the full deployment procedure.

**Deferred items (do not block deployment):**
- Cohere reranker not yet integrated — deterministic reranker is the current implementation
- Critic verifier swap-and-rerun not implemented — removes failing proposals instead
- `fetchPlacesAISummaries` not implemented — Gemini only as candidate source
- `location_score` is 0.5 placeholder — real distance scoring needs coordinates
- `totalCostMicros` always 0 in PipelineResult — cost aggregation not yet wired
- `constraint_coverage` not persisted to DB — pipeline-internal only
- Extended thinking beta string `'interleaved-thinking-2025-05-14'` needs verification (pre-production)
- `totalCostMicros` always 0 in PipelineResult — cost aggregation deferred (Session 7)

---

## Session Tracking

```
Current session: Session 9 — Deployment readiness
```

### Session log

- [x] Session 1: Skeleton + DB migration 009 (2026-05-20) — 33 new files, ai_logs / structured_constraints / restaurant_cache tables, proposals columns
- [x] Pre-S3 stabilization: migration 010 (guest_id + weight_multiplier + idempotent UNIQUE), @groupplan/ai added to type-check, shared withRetry utility, missing env vars in .env.example (2026-05-20)
- [x] Session 2: Track B — dealbreaker-detector, implicit-inference, constraint-extractor (2026-05-20) — 127/127 tests
- [x] Session 3: Track A — Gemini function-calling adapter, Menu Phantom Tier 1 (keyword inference), cache integration, DataSource/DietarySignal/DietaryAnalysis/EnrichedCandidate types (2026-05-20) — 148/148 tests
- [x] Session 4: Scoring stack — deterministic-scorer, RestaurantScore extended with confidence/penalties/bonuses/constraintMatchSummary (2026-05-20) — 162/162 tests
- [x] Session 5: Intelligence stack — vibe-embedder (Voyage AI REST), deterministic reranker, fairness-checker with envy model + priceLevel guard (2026-05-20) — 184/184 tests
- [x] Session 6: Orchestrator wiring + reasoning engine + critic verifier + narrative generator + PIPELINE_V2 feature flag in trigger route (2026-05-20) — 209/209 tests
- [x] Session 7: Production hardening — RPC v2 columns, RLS documentation, critic replacement fill, groupSummary fallback, extended thinking env var, cuisine word-token matching, rating guards (2026-05-20)
- [x] Session 8: Full integration test suite — 23 new integration tests, end-to-end pipeline validation, data integrity checks, failure-mode coverage (2026-05-20)
- [x] Session 8.5: Privacy hardening — anonymized envy_scores keys across reasoning-engine/critic-verifier/narrative-generator; all 5 Anthropic calls verified clean (2026-05-21)
- [x] Session 9: Deployment readiness — env validation, deployment checklist, rollout procedure (2026-05-21)

### Decisions log

**Session 1:**
- Migration number is `009_ai_pipeline.sql` (not `003` — migrations 001–008 pre-existed)
- `safeLogStage()` is fire-and-forget; use by default. `logStage()` throws on DB failure — only use when logging failure must propagate.
- `menuPhantom` exports as bare function alias for `enrich`; `deterministicScorer` exports as `{ score }` object

**Pre-Session-3 stabilization:**
- `structured_constraints.guest_id` and `.weight_multiplier` were missing from migration 009. Added via migration 010 with `ADD COLUMN IF NOT EXISTS`.
- `UNIQUE(invitation_id)` added idempotently via `DO $$ ... $$` block in migration 010.
- `@groupplan/ai` added to turbo `type-check` pipeline so tsc runs on the AI package.
- `withRetry` extracted to `packages/ai/src/utils/retry.ts` (was duplicated in two stage files).

**Session 2:**
- `implicit-inference` returns `ImplicitInferenceResult { context, inferred }`, not just `ImplicitContext` — richer than spec.
- `intensity_tier` on `StructuredConstraint` includes `'inferred'` as a 4th value (spec had 3).
- `constraint-extractor` DB write is fatal — structured constraints are required pipeline state, not just logs.
- `ConstraintItem` / `ConstraintStrength` / `ImplicitInferenceResult` added to `pipeline/types.ts`.

**Session 3:**
- Gemini REST API has no `google_maps` tool. Used function calling instead. All candidates are `source: 'inferred'`, not `'grounded'`.
- **Gemini `place_id` values are model-generated slugs — not canonical Google Maps IDs.** Treat as session-local opaque identifiers. Do not assume stability or cross-run consistency.
- `DietarySignal.source`: `'grounded'` (verified) / `'inferred'` (keyword-derived) / `'unknown'` (not mentioned). Tier 1 never sets `'grounded'`.
- Menu Phantom Tier 2 / Tier 3 are stubs (`PipelineError('not implemented')`).
- Cache writes in Menu Phantom are non-fatal.

**Session 4:**
- Disqualification is ONLY triggered by: (1) hard `cuisine_avoids` match on candidate `cuisine_types`, or (2) estimated price exceeds ALL hard-budget guests by >50%. Unknown dietary signals never disqualify.
- `deterministicScorer` exported as `{ score }` to match `deterministicScorer.score(candidates, constraints)` in orchestrator.
- `vibeMatchScore = 0.0` placeholder; `location_score = 0.5` placeholder — both deferred.
- `RestaurantScore` extended with `confidence`, `penalties`, `bonuses`, `constraintMatchSummary`.
- `review_score` clamped to [0, 1] via `clamp()` to guard against out-of-range Gemini ratings.

**Session 5:**
- Cohere reranker deferred. Reranker is deterministic: `composite * 0.50 + confidence * 0.25 + vibeMatchScore * 0.25`. Top 5 returned.
- Vibe embedder uses Voyage AI REST API via `fetch` — no `voyageai` SDK added.
- Candidates with empty `review_summary` → `vibeMatchScore: 0.3` (neutral-low, not 0.0).
- Fairness checker: `priceLevel === 0` (unknown price) → skip budget envy. `budget_max === 999999` → treat as unconstrained, skip budget envy.
- Fairness warnings are **uncertainty/context signals** for the reasoning engine — not disqualification signals. Warnings will be frequent with Tier 1 data (inferred dietary_score cap ~0.7, below the `< 1.0` threshold). This is intentional.
- `envy_scores?` and `fairness_warnings?` added as optional fields on `RestaurantScore`.

**Session 6:**
- Orchestrator uses injectable `EventDataLoader` for testability. Default loader queries Supabase directly (event + invitations + guest_preferences).
- `guest_id` in pipeline uses `invitation.id` (not `user_id`) — `user_id` is nullable for non-authenticated guests.
- `fetchPlacesAISummaries` not yet implemented — orchestrator uses Gemini candidates only.
- Critic verifier simplified: removes failing proposals, does not swap-and-rerun. Deferred to Session 7.
- Extended thinking beta string: `'interleaved-thinking-2025-05-14'` — must verify against current Anthropic docs before production.
- `PipelineResult.candidateDetails: Record<string, CandidateDetail>` carries restaurant info so the trigger route can map `place_id` → DB row fields.
- V2 trigger route does NOT yet write `envy_scores`/`narrative_personal`/`confidence_score` to DB — `database.types.ts` must be regenerated first (Session 7).
- `totalCostMicros` always 0 in `PipelineResult` — cost aggregation deferred to Session 7.

**Session 7:**
- RPC `replace_proposals_and_advance` updated (migration 011) to write envy_scores, narrative_group, narrative_personal, confidence_score. Prior to this, v2 columns were silently dropped at DB write.
- RLS on ai_logs, structured_constraints, restaurant_cache: deny-by-default (no user-facing policies). Service role bypasses RLS automatically. Table COMMENT blocks document intent.
- database.types.ts proposals section manually updated to include v2 columns. Does not require supabase gen types re-run.
- Critic replacement: orchestrator fills dropped proposal slots from fairnessAnnotated alternates without extra AI calls. Narrative generator handles replacements normally.
- groupSummary fallback: comma-separated candidate names when narrative_group is empty.
- Extended thinking is now opt-in via ANTHROPIC_EXTENDED_THINKING=false env var (default false). Safe for production environments that have not verified the beta.
- Cuisine avoidance matching changed to word-token exact matching to prevent false positives (e.g., "bar" no longer matches "Barbecue"). Affects both disqualification and scoring paths.
- Reranker safeLogStage wrapped in try/catch so a synchronously-thrown mock cannot fail the stage.
- safeRating() and safeReviewCount() helpers added to scorer to guard against NaN, Infinity, negative, or non-integer values from Gemini-sourced candidates.
- constraint_coverage is not persisted by replace_proposals_and_advance. Acceptable for now — it is pipeline-internal and not required by the UI. If future UX needs per-constraint coverage from the DB, add migration 012 to update the RPC.

**Session 8:**
- Integration tests mock only external providers (Anthropic SDK, fetch, Supabase) and run actual stage logic. This catches cross-stage data flow bugs that unit tests miss.
- constraint_coverage not tested for DB persistence (confirmed: acceptable, pipeline-internal only).
- Guest anonymization verified: all 5 Anthropic calls confirmed clean of real invitation UUIDs after Session 8.5 fix.
- narrative_personal remapping verified: guest_0 keys not present in final output.
- Fairness warnings verified as non-fatal: high envy does not throw PipelineError.
- Grounded dietary source verified: Tier 1 Menu Phantom never sets source='grounded' in integration flow.
- logger and retry mocked at integration level to avoid Supabase side-effects from safeLogStage.
- cache (getCachedRestaurant/setCachedRestaurant) mocked at integration level for full cache path control.
- vi.clearAllMocks() does NOT clear mockResolvedValueOnce queues; must use individual mockReset() calls in setupDefaultMocks to prevent stale mock responses bleeding between tests.
- Codex self-review found and fixed a bug: allowed_function_names -> allowedFunctionNames in gemini.ts Gemini REST request body (camelCase required by Gemini API).

**Session 8.5 — Privacy hardening:**
- Real invitation UUIDs were leaking into Anthropic prompts via `envy_scores` map keys in reasoning-engine, critic-verifier, and narrative-generator. Root cause: fairness-checker populates `envy_scores` with real guest_ids as keys; these maps were serialized directly into prompts.
- Fix: `anonymizeGuestKeys(map, constraints)` helper added to each of the three stages. Maps real guest_id → `guest_N` before any data enters a prompt. Drop entries with no matching constraint (safe no-op in practice).
- `sanitizeProposalsForPrompt()` in critic-verifier and narrative-generator ensures the entire proposal object is sanitized before serialization — prevents any future field addition from accidentally leaking an ID.
- Integration test 16 expanded from first-2-calls to all-5-calls. All Anthropic calls now verified clean of real UUIDs in CI.
- This was the last known privacy gap blocking production readiness.

**Session 9 — Deployment readiness:**
- Env validation added to trigger route v2 path: checks 7 required env vars at request time, returns `v2_misconfigured` 500 with var names (not values) if any are missing. PIPELINE_V2 remains false by default.
- Deployment checklist created at `docs/PIPELINE_V2_DEPLOYMENT_CHECKLIST.md`.
- Privacy rule codified in Code Conventions: all external AI calls must use guest aliases, never real internal identifiers.
- Rollout sequence: apply migrations with V2 off → verify legacy → add provider keys → staging event → internal prod event → limited rollout. Rollback is `PIPELINE_V2=false` + redeploy.
