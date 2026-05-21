# GroupPlan AI Pipeline v2 — Complete Build Plan

**Author:** Anderson McAlpine
**Date:** May 19, 2026
**Repo:** github.com/andersonmcalpine/groupplan
**Stack:** Next.js 14+ / Supabase / TypeScript / pnpm + Turborepo


## 1. Current State

The existing codebase has 5 abstraction packages (`@groupplan/ai`, `venues`, `notifications`, `calendar`, `db`), a Next.js app with 13 API routes and 9 pages, and a Supabase backend with 7 tables. The AI pipeline is a single-shot pattern: guest preferences are collected, restaurants are fetched from Google Places/Yelp, and one Claude Haiku API call produces 3 ranked proposals with reasoning. The output is structured JSON parsed via an `assistant` prefill hack (not `tool_use`).

### Known Issues (from Security Review)
- JSON extraction via prefill is fragile — should migrate to `tool_use` structured output
- No retry logic on AI calls
- Proposal rank DB constraint caps at 3 but schema allows up to 10
- Vibe frequency weighting is absent (one "upscale" vote = five "casual" votes)
- Median budget not surfaced alongside strict intersection
- `PRICING` table in `claude.ts` will silently go stale
- Google Places API key embedded in image URLs stored in DB


## 2. Target Architecture

The new pipeline replaces the single AI call with a multi-stage system using 4 external AI providers (Anthropic, Google Gemini, Cohere, Yelp) plus custom deterministic logic.

```
PREFERENCE INPUT
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  TRACK B: Preference Processing (sequential, fast)       │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │ Dealbreaker  │──▶│  Implicit     │──▶│  Constraint  │  │
│  │ Detector     │   │  Inference    │   │  Extractor   │  │
│  │ (Haiku)      │   │ (deterministic)│  │ (Haiku+Think)│  │
│  └─────────────┘   └──────────────┘   └──────────────┘  │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────┐
│  TRACK A: Data Enrichment │(parallel, network-bound)     │
│  ┌─────────────┐   ┌─────┴────────┐   ┌──────────────┐  │
│  │ Gemini Maps  │   │ Places AI    │   │ Menu Phantom │  │
│  │ Grounding    │   │ Summaries    │   │ (tiered)     │  │
│  │ (Flash)      │   │ (REST)       │   │              │  │
│  └─────────────┘   └──────────────┘   └──────────────┘  │
└───────────────────────────┬──────────────────────────────┘
                            │
                     ┌──────┴──────┐
                     │  SYNC POINT │
                     │  Merge A+B  │
                     └──────┬──────┘
                            │
                 ┌──────────▼──────────┐
                 │ Deterministic Scorer │
                 │ (TypeScript, no API) │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Voyage Embeddings   │
                 │  (vibe similarity)   │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │   Cohere Rerank     │
                 │   (top 5 selection) │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Fairness Red-Flag  │
                 │  (envy score check) │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Claude Sonnet +    │
                 │  Extended Thinking  │
                 │  (final reasoning)  │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │  Claude Critic +    │
                 │  Yelp Verification  │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │ Compromise Narrative │
                 │ (group + personal)  │
                 └──────────┬──────────┘
                            │
                     ┌──────▼──────┐
                     │  PROPOSALS  │
                     └─────────────┘
```

**Target latency:** 6–8 seconds (with Track A and Track B running in parallel).
**Target cost:** ~$0.06–0.10 per event.


## 3. Phased Build Plan

### Phase 1: Foundation (V1 Launch) — Weeks 1–4

**Goal:** Replace the single Haiku call with a working multi-stage pipeline. Ship the minimum viable version of each layer.

#### Week 1: Infrastructure + Migrations

**Task 1.1 — New database tables**

Create migration `003_ai_pipeline.sql`:

```sql
-- Stores every AI pipeline execution for debugging + future training
CREATE TABLE ai_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage         TEXT NOT NULL,           -- 'dealbreaker', 'constraint', 'scoring', 'reasoning', 'critic'
  provider      TEXT NOT NULL,           -- 'anthropic', 'google', 'cohere', 'voyage'
  model         TEXT NOT NULL,           -- 'claude-haiku-4-5', 'gemini-3-flash', etc.
  input_hash    TEXT,                    -- SHA256 of input for dedup
  input_tokens  INTEGER,
  output_tokens INTEGER,
  latency_ms    INTEGER,
  cost_micros   INTEGER,                 -- cost in microdollars
  raw_input     JSONB,
  raw_output    JSONB,
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_logs_event ON ai_logs(event_id);
CREATE INDEX idx_ai_logs_stage ON ai_logs(stage);

-- Structured constraint representation per guest
CREATE TABLE structured_constraints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id   UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  dietary_hard    TEXT[] DEFAULT '{}',    -- allergies, celiac, etc. (blockers)
  dietary_soft    TEXT[] DEFAULT '{}',    -- preferences like "prefer vegetarian"
  cuisine_likes   JSONB DEFAULT '{}',    -- { "italian": 0.9, "japanese": 0.7 }
  cuisine_avoids  TEXT[] DEFAULT '{}',
  budget_min      INTEGER,               -- cents
  budget_max      INTEGER,               -- cents
  vibe_tags       TEXT[] DEFAULT '{}',   -- 'romantic', 'casual', 'upscale'
  dealbreaker_flags TEXT[] DEFAULT '{}', -- things that auto-disqualify a venue
  intensity_tier  TEXT DEFAULT 'soft',   -- 'hard', 'strong', 'soft'
  raw_text        TEXT,                  -- original free-text input
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_constraints_event ON structured_constraints(event_id);

-- Cached restaurant analyses (Menu Phantom + embedding results)
CREATE TABLE restaurant_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id        TEXT UNIQUE NOT NULL,  -- Google Places ID
  name            TEXT NOT NULL,
  dietary_analysis JSONB,               -- { vegetarian_score: 8, gf_score: 3, ... }
  vibe_embedding  VECTOR(1024),         -- Voyage embedding of review/vibe text
  review_summary  TEXT,                 -- Google AI review summary
  menu_analysis   JSONB,               -- tiered menu analysis result
  last_analyzed   TIMESTAMPTZ DEFAULT now(),
  ttl_days        INTEGER DEFAULT 30
);
CREATE INDEX idx_rcache_place ON restaurant_cache(place_id);

-- Per-proposal fairness + satisfaction tracking
ALTER TABLE proposals ADD COLUMN envy_scores JSONB;         -- { "guest_uuid": 0.3, ... }
ALTER TABLE proposals ADD COLUMN constraint_coverage JSONB;  -- which constraints met/missed
ALTER TABLE proposals ADD COLUMN narrative_group TEXT;        -- group-facing narrative
ALTER TABLE proposals ADD COLUMN narrative_personal JSONB;   -- { "guest_uuid": "your narrative" }
ALTER TABLE proposals ADD COLUMN confidence_score FLOAT;     -- pipeline confidence 0-1
```

**Task 1.2 — Environment variables + API keys**

Add to `.env.local` and `.env.example`:

```
# Existing
ANTHROPIC_API_KEY=
GOOGLE_PLACES_API_KEY=
YELP_API_KEY=

# New for pipeline v2
GEMINI_API_KEY=                    # Google AI Studio key
COHERE_API_KEY=                    # Cohere trial key (free)
VOYAGE_API_KEY=                    # Voyage AI key
ANTHROPIC_MODEL_REASONING=claude-sonnet-4-6
ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001
PIPELINE_PARALLELISM=true
PIPELINE_LOG_LEVEL=info            # 'debug' logs full I/O
```

**Task 1.3 — Package restructure**

Restructure `packages/ai` from a single adapter into a pipeline orchestrator:

```
packages/ai/
├── src/
│   ├── pipeline/
│   │   ├── orchestrator.ts        # Main pipeline entry point
│   │   ├── parallel-runner.ts     # Runs Track A + Track B concurrently
│   │   └── types.ts               # Pipeline stage interfaces
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
│   │   ├── anthropic.ts           # Claude Haiku + Sonnet calls
│   │   ├── gemini.ts              # Gemini Flash + Maps grounding
│   │   ├── cohere.ts              # Rerank + Embed
│   │   ├── voyage.ts              # Voyage embeddings
│   │   └── yelp-ai.ts             # Yelp AI verification
│   ├── prompts/
│   │   ├── dealbreaker.ts
│   │   ├── constraint-extraction.ts
│   │   ├── reasoning-system.ts
│   │   ├── critic-system.ts
│   │   └── narrative-system.ts
│   ├── utils/
│   │   ├── logger.ts              # AI log writer
│   │   ├── cost-tracker.ts
│   │   └── cache.ts               # Restaurant cache manager
│   └── interface.ts               # Updated AIProvider interface
├── package.json
└── tsconfig.json
```


#### Week 2: Stages 1–3 (Preference Processing + Data Enrichment)

**Task 2.1 — Dealbreaker Detector**

File: `stages/dealbreaker-detector.ts`

Input: Raw guest preference text for all guests.
Output: Per-guest `{ hard: string[], strong: string[], soft: string[] }` classification.

Implementation: Single Claude Haiku call with `tool_use`. Define a tool schema:
```typescript
{
  name: "classify_constraints",
  input_schema: {
    type: "object",
    properties: {
      guests: {
        type: "array",
        items: {
          type: "object",
          properties: {
            guest_id: { type: "string" },
            hard_blockers: {
              type: "array", items: { type: "string" },
              description: "Allergies, medical dietary needs, accessibility — violating any disqualifies a venue"
            },
            strong_preferences: {
              type: "array", items: { type: "string" },
              description: "Cuisine dislikes, firm budget limits, stated vibe requirements"
            },
            soft_wishes: {
              type: "array", items: { type: "string" },
              description: "Nice-to-haves, cuisine likes, location preferences"
            }
          }
        }
      }
    }
  }
}
```

System prompt emphasizes: "Classify based on the PHRASING INTENSITY of the original text. 'I'm allergic' = hard. 'I'd prefer' = soft. 'I don't eat' = strong. When uncertain, escalate to the next higher tier — false positives are better than missed blockers."

**Task 2.2 — Implicit Inference Engine**

File: `stages/implicit-inference.ts`

This is deterministic (no API call). Takes event metadata and enriches the constraint profile:

```typescript
interface ImplicitContext {
  event_type_hint: 'work' | 'social' | 'date' | 'celebration' | 'general';
  meal_type: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'late_night';
  formality_bias: number;     // -1 (casual) to +1 (formal)
  group_size_class: 'intimate' | 'small' | 'medium' | 'large';
}
```

Rules (hardcoded for v1, no ML):
- Title contains "birthday"/"bday" → `celebration`, formality_bias +0.3
- Title contains "team"/"standup"/"offsite" → `work`, formality_bias +0.5
- Event time 10am–2pm → `lunch`/`brunch` (weekend = brunch)
- Event time 5pm–8pm → `dinner`; 8pm+ → `late_night`, formality_bias +0.2
- Guest count 2 → `intimate`; 3–6 → `small`; 7–12 → `medium`; 13+ → `large`

Surface these as a confirmation card to the host (not hidden). See UX section.

**Task 2.3 — Constraint Extractor**

File: `stages/constraint-extractor.ts`

Input: Dealbreaker-classified preferences + implicit context.
Output: `StructuredConstraint[]` written to `structured_constraints` table.

Implementation: Claude Haiku with Think Tool + `tool_use`. The Think Tool lets the model reason about ambiguous preferences before committing to the structured output. Define the output schema as a tool that captures weighted cuisine preferences (0.0–1.0 scale), budget ranges in cents, and vibe tags.

**Task 2.4 — Gemini Maps Grounding (Track A)**

File: `adapters/gemini.ts`

Runs in parallel with Track B. Takes structured constraints and makes a Gemini Flash call with `google_maps` grounding enabled:

```typescript
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
  body: JSON.stringify({
    contents: [{ parts: [{ text: buildGroundingPrompt(constraints, location) }] }],
    tools: [{ google_maps: {} }],
  })
});
```

Returns enriched restaurant candidates with live hours, ratings, photos, review context — all verified against Maps data. This supplements (doesn't replace) your existing Google Places adapter, giving you AI-curated results alongside raw API results.

**Task 2.5 — Menu Phantom (Track A, tiered)**

File: `stages/menu-phantom.ts`

Tiered approach to avoid unnecessary vision API costs:

Tier 1 — Google Places AI review summary (already fetched in 2.4). Parse for dietary mentions.
Tier 2 — If dietary info is ambiguous, `web_fetch` the restaurant's /menu page and parse text.
Tier 3 — Only if Tiers 1–2 lack dietary info AND a guest has a hard dietary blocker, fetch menu photos from Places API and run through Gemini Flash vision.

Cache all results in `restaurant_cache` table with 30-day TTL.


#### Week 3: Stages 4–7 (Scoring, Ranking, Reasoning)

**Task 3.1 — Deterministic Scorer**

File: `stages/deterministic-scorer.ts`

Pure TypeScript, no API calls. For each (restaurant, group) pair, compute:

```typescript
interface RestaurantScore {
  place_id: string;
  dietary_score: number;      // 0-1: fraction of hard/strong dietary needs met
  budget_score: number;       // 0-1: overlap of group budget range with price tier
  cuisine_score: number;      // 0-1: weighted average of cuisine preference matches
  location_score: number;     // 0-1: inverse distance from event location hint
  review_score: number;       // 0-1: normalized Google/Yelp rating
  composite: number;          // weighted sum
  disqualified: boolean;      // true if any hard blocker is unmet
  disqualify_reason?: string;
}
```

Weights for v1: dietary 0.30, budget 0.25, cuisine 0.20, location 0.15, review 0.10. These are tunable and should eventually be learned from satisfaction data.

Hard filter: any restaurant where `dietary_score < 1.0` for a hard blocker guest is disqualified entirely.

**Task 3.2 — Voyage Vibe Embedder**

File: `stages/vibe-embedder.ts`

For each non-disqualified restaurant, embed its review summary + attributes text using Voyage:

```typescript
const vo = new VoyageAIClient({ apiKey: VOYAGE_API_KEY });
const result = await vo.embed({
  input: restaurantTexts,
  model: "voyage-3",
  inputType: "document"
});
```

Also embed the group's synthesized vibe description ("romantic upscale Italian dinner for 4") as a query vector. Compute cosine similarity between the group query and each restaurant's embedding. Store embeddings in `restaurant_cache.vibe_embedding` for reuse.

**Task 3.3 — Cohere Rerank**

File: `stages/reranker.ts`

Take the top ~15 restaurants by composite score, and rerank them using Cohere Rerank with the group's full constraint profile as the query:

```typescript
const cohere = new CohereClient({ token: COHERE_API_KEY });
const reranked = await cohere.v2.rerank({
  model: "rerank-v3.5",
  query: buildRerankerQuery(constraints),
  documents: restaurants.map(r => r.enrichedDescription),
  topN: 5
});
```

This catches semantic matches the deterministic scorer misses — a restaurant described as "cozy neighborhood spot with an amazing wine list" might not score high on explicit cuisine keywords but is a perfect match for a "casual romantic dinner" query.

**Task 3.4 — Fairness Red-Flag Checker**

File: `stages/fairness-checker.ts`

For each of the top 5 candidates, compute per-guest envy scores:

```typescript
function computeEnvyScore(guest: StructuredConstraint, restaurant: ScoredRestaurant): number {
  let envy = 0;
  // How much does this guest's ideal restaurant differ from this one?
  if (guest.intensity_tier === 'hard') {
    // Hard constraint not met = envy score 1.0 (maximum)
    envy = restaurant.dietary_score < 1.0 ? 1.0 : 0;
  }
  // Budget mismatch: how far outside their range?
  const budgetGap = Math.max(0, restaurant.priceLevel - guest.budget_max) / guest.budget_max;
  envy += budgetGap * 0.5;
  // Vibe mismatch
  envy += (1 - restaurant.vibeMatchScore) * 0.3;
  return Math.min(envy, 1.0);
}
```

This stage doesn't filter — it annotates. The output is `{ restaurant_id, envy_scores: { guest_uuid: number } }` passed to the reasoning engine. If any guest has an envy score > 0.7, the reasoning engine receives a warning: "Guest X may have a poor experience at this restaurant because [reason]."

**Task 3.5 — Reasoning Engine**

File: `stages/reasoning-engine.ts`

Single Claude Sonnet call with extended thinking (budget_tokens: 5000) and `tool_use` for structured output. This is the core intelligence layer.

System prompt includes:
- The structured constraint summary
- The top 5 reranked candidates with all scores
- Fairness warnings from the envy checker
- Implicit context (event type, meal type, group size)
- Instructions to select 3 proposals with rankings and reasoning

The `tool_use` schema enforces the output format:

```typescript
{
  name: "submit_proposals",
  input_schema: {
    type: "object",
    properties: {
      proposals: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            place_id: { type: "string" },
            rank: { type: "integer", minimum: 1, maximum: 3 },
            reasoning: { type: "string" },
            constraints_met: { type: "array", items: { type: "string" } },
            constraints_gap: { type: "array", items: { type: "string" } },
            fairness_note: { type: "string" }
          }
        }
      },
      group_summary: { type: "string" },
      conflicts_resolved: { type: "array", items: { type: "string" } }
    }
  }
}
```

**Task 3.6 — Critic Verifier**

File: `stages/critic-verifier.ts`

Claude Haiku call with a different system prompt. It receives the 3 proposals and the original constraints, and its job is to find flaws:

"You are a skeptical reviewer. For each proposal, verify: (1) Does the restaurant actually accommodate all hard dietary blockers? (2) Is the price range realistic for the group size? (3) Are there factual claims in the reasoning that might be wrong? (4) Is there a better candidate in the top 5 that was overlooked? Flag any issues."

If the critic flags a hard failure (e.g., "Restaurant A claims gluten-free options but the review summary mentions only pasta dishes"), the orchestrator swaps in the next candidate from the reranked list and re-runs reasoning for that slot only.


#### Week 4: Narrative + Orchestrator + Integration

**Task 4.1 — Compromise Narrative Generator**

File: `stages/narrative-generator.ts`

Two outputs per proposal:

**Group narrative** (shown to everyone): Positive, celebratory, 2–3 sentences. No individual preference attributions. Example: "This spot balances great plant-based options with a lively dinner atmosphere, and fits comfortably in the group's budget range."

**Personal narrative** (shown only to each guest, in their private view): Acknowledges their specific constraints. Example: "We found a restaurant with 6 vegetarian entrées — not just salads. The price range sits right in your $25–35 sweet spot."

Implementation: Single Haiku call per proposal set, using `tool_use` to return structured `{ group: string, personal: { [guest_id]: string } }`.

Critical rule in the prompt: "NEVER reveal one guest's preferences to another. The group narrative must not contain any information that would let Guest A infer Guest B's specific dietary restriction or budget."

**Task 4.2 — Pipeline Orchestrator**

File: `pipeline/orchestrator.ts`

The main entry point. Coordinates all stages, handles parallelism, error recovery, logging, and cost tracking.

```typescript
export async function runPipeline(eventId: string): Promise<PipelineResult> {
  const startTime = Date.now();

  // 1. Load preferences + event metadata
  const { preferences, event } = await loadEventData(eventId);

  // 2. TRACK B: Preference processing (sequential)
  const dealbreakers = await dealbreakerDetector.run(preferences);
  const implicit = implicitInference.run(event);
  const constraints = await constraintExtractor.run(preferences, dealbreakers, implicit);

  // 3. TRACK A: Data enrichment (parallel with Track B via Promise.all at merge)
  const [mapsCandidates, placesSummaries] = await Promise.all([
    geminiMapsGrounding.run(constraints, event.location_hint),
    fetchPlacesAISummaries(event.location_hint, constraints),
  ]);

  // 4. Merge candidates + deduplicate by place_id
  const allCandidates = mergeCandidates(mapsCandidates, placesSummaries);

  // 5. Menu Phantom (tiered, uses cache)
  const enrichedCandidates = await menuPhantom.enrich(allCandidates, constraints);

  // 6. Deterministic scoring
  const scored = deterministicScorer.score(enrichedCandidates, constraints);
  const qualified = scored.filter(s => !s.disqualified);

  // 7. Vibe embeddings
  const withVibes = await vibeEmbedder.run(qualified, constraints);

  // 8. Cohere Rerank → top 5
  const top5 = await reranker.run(withVibes, constraints);

  // 9. Fairness red-flag check
  const fairnessAnnotated = fairnessChecker.run(top5, constraints);

  // 10. Claude Sonnet reasoning
  const proposals = await reasoningEngine.run(fairnessAnnotated, constraints, implicit);

  // 11. Critic verification
  const verified = await criticVerifier.run(proposals, constraints);

  // 12. Narrative generation
  const withNarratives = await narrativeGenerator.run(verified, constraints);

  // 13. Log everything
  const totalLatency = Date.now() - startTime;
  await aiLogger.logPipelineRun(eventId, withNarratives, totalLatency);

  return withNarratives;
}
```

**Task 4.3 — API route update**

Update `apps/web/app/api/events/[id]/trigger/route.ts` to call the new orchestrator instead of the old single-shot Claude adapter. Keep the old adapter behind a feature flag for rollback:

```typescript
const USE_PIPELINE_V2 = process.env.PIPELINE_V2 === 'true';

if (USE_PIPELINE_V2) {
  result = await runPipeline(eventId);
} else {
  result = await legacyClaudeAdapter.synthesize(preferences, restaurants);
}
```

**Task 4.4 — UX: Host confirmation card**

When the event reaches "collecting" state and implicit inference runs, show the host a card:

```
🍽️ We detected: Birthday dinner · Saturday evening · 6 guests
   Searching for: Dinner spots with a celebratory vibe
   [✓ Looks right]  [✏️ Change this]
```

Tapping "Change this" opens a simple picker for event type + meal type. This prevents hidden assumptions while keeping the flow fast (one tap to confirm).

**Task 4.5 — UX: Proposal cards with narratives**

Update the proposal display to show:
- Restaurant name, photo, rating, price range (existing)
- Group narrative (new — 2-3 sentence positive framing)
- Confidence badge (new — "Strong match" / "Good match" / "Compromise pick" based on pipeline confidence score)
- Per-guest personalized insight (new — visible only in each guest's view)
- "Why this pick?" expandable section showing constraints met/missed


### Phase 2: Enrichment (V1.5) — Weeks 5–8

**Goal:** Add intelligence layers that improve quality but aren't critical for launch.

#### Week 5–6: Menu Phantom Tier 3 + Social Weighting

**Task 5.1 — Menu Phantom vision fallback**

Implement Tier 3: for restaurants where Tiers 1–2 lack dietary info AND a guest has a hard dietary blocker, fetch up to 3 menu photos from Google Places Photos API and run through Gemini Flash vision:

Prompt: "Analyze this restaurant menu photo. For each dietary category (vegetarian, vegan, gluten-free, halal, kosher, nut-free), rate the options on a 1-10 scale where 1 = 'one sad salad' and 10 = 'dedicated menu section with creative options'. Return structured JSON."

Cache all results in `restaurant_cache.menu_analysis`.

**Task 5.2 — Social weight toggles (host-controlled)**

Add to event creation form:
- "Guest of honor" toggle per invitee (1.5x preference weight)
- "VIP guest" toggle (1.3x weight)
- Weights are visible in the proposal reasoning: "We weighted Jake's preferences higher because they're the guest of honor"

Stored as `weight_multiplier` on the `invitations` table.

#### Week 7–8: Fairness solver upgrade + Implicit inference v2

**Task 7.1 — Fairness as proposal annotation**

Upgrade the fairness checker to compute formal EF1 envy scores and surface them in the proposal cards. If a proposal has a guest with envy > 0.7, add a visible note: "Heads up: this pick is a stretch for Sarah's budget — she might prefer Option B."

**Task 7.2 — Implicit inference overrides**

Add a "context" step to the RSVP flow where the guest confirms their preference category:
- "What's this dinner for you?" → Casual hangout / Work event / Special occasion / Date night
- This takes 2 seconds and eliminates the need for hidden inference about context.

Store on the invitation as `guest_context_tag`.


### Phase 3: Learning Loop (V2) — Weeks 9–14

**Goal:** Close the feedback loop so the pipeline improves over time.

#### Week 9–10: Voting outcome tracking

**Task 9.1 — Structured outcome logging**

After voting concludes, write to a new `outcomes` table:

```sql
CREATE TABLE outcomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  winning_place_id TEXT NOT NULL,
  vote_margin     INTEGER,          -- winning votes minus runner-up
  total_voters    INTEGER,
  constraint_profile_hash TEXT,     -- hash of the group's constraint vector
  pipeline_confidence FLOAT,        -- what the pipeline predicted
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

This is free — it uses data you already collect (votes).

#### Week 11–12: Post-event feedback (one-tap)

**Task 11.1 — Post-event nudge**

24 hours after the event date, send each attending guest a push notification:

"How was dinner at [Restaurant Name]? 👍 👎"

One tap. No form. Store as `post_event_rating` (1 or -1) on the `invitations` table.

**Task 11.2 — Satisfaction signal aggregation**

Combine voting outcome + post-event rating into a satisfaction score per event:

```typescript
satisfaction = (vote_margin / total_voters) * 0.4
            + (positive_ratings / total_ratings) * 0.6;
```

#### Week 13–14: Satisfaction predictor (v1)

**Task 13.1 — Train a lightweight model**

Once you have ~500 events with outcomes, train a gradient-boosted model (XGBoost) that predicts satisfaction from:

Features:
- Group size
- Budget range spread (max - min across group)
- Number of hard dietary blockers
- Cuisine diversity score (how varied the preferences are)
- Event type
- Restaurant price tier
- Restaurant rating
- Vibe match score

Target: satisfaction score (0–1)

This runs locally as a Python script, exports a serialized model, and loads into a Supabase Edge Function. At inference time, it adds a `predicted_satisfaction` signal to each candidate before the reasoning engine.


### Phase 4: Compounding Moat (V3) — Weeks 15–20

**Goal:** Build features that get better with usage and are impossible to replicate without your data.

#### Returning user preference profiles

After a user participates in 3+ events, build a preference profile from their voting history and feedback. "Anderson consistently votes for upscale options and gave thumbs-up to 4/5 Italian restaurants." When Anderson RSVPs and selects "no preference," the pipeline treats it as "slight upscale bias, Italian-leaning" based on history.

Stored in a `user_profiles` table, updated nightly via a Supabase Edge Function that aggregates voting + feedback data.

#### Cross-event restaurant scoring

Track which restaurants get picked, voted for, and rated well. Build a GroupPlan-internal rating that supplements Google/Yelp ratings: "This restaurant has been picked by 12 groups and has a 92% satisfaction rate on GroupPlan." This is proprietary data nobody else has.


## 4. API Keys + Service Setup Checklist

| Service | What to Get | Where | Free Tier |
|---------|------------|-------|-----------|
| Anthropic | API key | console.anthropic.com | Pay-per-use |
| Google AI Studio | Gemini API key | aistudio.google.com | 5,000 grounded prompts/month free |
| Cohere | Trial API key | dashboard.cohere.com | 1,000 calls/month free |
| Voyage AI | API key | dash.voyageai.com | 200M tokens free |
| Google Places | API key (existing) | console.cloud.google.com | $200/month credit |
| Yelp Fusion | API key (existing) | yelp.com/developers | 5,000 calls/day |

**Total monthly cost at 100 events/month:** ~$6–10
**Total monthly cost at 1,000 events/month:** ~$60–100


## 5. Testing Strategy

### Unit tests (per stage)

Each stage in `stages/` gets its own test file with mock inputs:
- `dealbreaker-detector.test.ts` — test with edge cases: "I'm deathly allergic to peanuts" (hard), "sushi would be nice" (soft), "NO seafood" (strong)
- `deterministic-scorer.test.ts` — test disqualification logic, score calculation, edge cases (all guests have same preference, completely conflicting preferences)
- `fairness-checker.test.ts` — test envy score computation, verify scores are 0 when all constraints match

### Integration tests

- `pipeline.integration.test.ts` — end-to-end test with mocked API responses for all providers. Verify full pipeline produces valid proposals with narratives.
- Latency benchmark: assert total pipeline time < 10 seconds with mocked network latency of 500ms per call.

### Manual QA scenarios

1. **Happy path:** 4 guests, compatible preferences, downtown location → 3 good proposals
2. **Conflict path:** 1 vegan in a group of steakhouse fans → verify vegan options are verified, compromise narrative addresses it
3. **Budget clash:** 1 guest at $15 max, others at $50+ → verify fair handling
4. **Edge case:** all guests say "no preference" → verify implicit inference produces reasonable defaults
5. **Single guest:** just the host → verify pipeline doesn't break with n=1


## 6. Rollback Plan

The `PIPELINE_V2` feature flag allows instant rollback to the legacy single-shot Haiku adapter. If the new pipeline causes issues in production:

1. Set `PIPELINE_V2=false` in Vercel environment variables
2. Redeploy (30 seconds on Vercel)
3. All events route through the legacy adapter
4. Diagnose via `ai_logs` table which stage failed

The new database tables and columns are additive — they don't break the existing schema. The legacy adapter ignores them.


## 7. Success Metrics

| Metric | V1 Baseline | V2 Target |
|--------|------------|-----------|
| Proposal generation latency | 2–3s (single call) | < 8s (full pipeline) |
| User-reported "bad pick" rate | Unknown | Track from v1 launch |
| Vote margin (winning proposal) | Unknown | Higher margin = stronger consensus |
| Post-event thumbs-up rate | N/A | > 70% |
| Pipeline cost per event | ~$0.005 | < $0.10 |
| Hard dietary constraint violations | Unknown (suspected >0) | 0 (guaranteed by pipeline) |


## 8. Claude Code Prompt

When you're ready to start building, paste this into Claude Code:

```
I'm upgrading the AI pipeline in my GroupPlan monorepo
(github.com/andersonmcalpine/groupplan). The current architecture is
a single Claude Haiku API call in packages/ai/src/adapters/claude.ts
that takes guest preferences + restaurant candidates and returns 3
ranked proposals.

I'm replacing this with a multi-stage pipeline. Start with Phase 1,
Week 1: create the database migration (003_ai_pipeline.sql) and
restructure packages/ai/ into the new directory layout with pipeline/,
stages/, adapters/, prompts/, and utils/ directories. Create stub files
for each stage with the TypeScript interfaces defined but implementation
as TODO. Wire up the orchestrator entry point.

Reference the build plan document for the exact schema, directory
structure, and interface definitions. Don't implement the actual API
calls yet — just the skeleton with correct types so everything compiles.
```
