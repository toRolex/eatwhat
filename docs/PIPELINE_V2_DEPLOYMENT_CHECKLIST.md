# Pipeline V2 Deployment Checklist

Use this document for every deployment that involves Pipeline V2 changes.
Keep `PIPELINE_V2=false` until every section below is verified.

---

## 1. Required environment variables

All of these must be set before `PIPELINE_V2=true` is safe.

| Variable | Purpose | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | All Haiku + Sonnet calls | Required by legacy path too |
| `ANTHROPIC_MODEL_FAST` | Haiku model ID | e.g. `claude-haiku-4-5-20251001` |
| `ANTHROPIC_MODEL_REASONING` | Sonnet model ID | e.g. `claude-sonnet-4-6` |
| `GEMINI_API_KEY` | Gemini candidate discovery | V2 only |
| `GEMINI_MODEL` | Gemini model ID | e.g. `gemini-2.5-flash` (stable) or `gemini-2.0-flash` |
| `VOYAGE_API_KEY` | Voyage AI embeddings | V2 only |
| `VOYAGE_MODEL` | Voyage model ID | e.g. `voyage-3` |
| `PIPELINE_V2` | Feature flag | Must be `false` until ready |
| `PIPELINE_LOG_LEVEL` | Logging verbosity | `info` for production; `debug` logs raw AI payloads (PII risk — do not use in prod) |
| `ANTHROPIC_EXTENDED_THINKING` | Extended thinking opt-in | `false` (default) — only set `true` if beta verified on your Anthropic account |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Required by all DB operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access | Required by all DB operations — never expose to client |

---

## 2. Supabase migrations

Apply in order. Each is idempotent (uses `IF NOT EXISTS` or `CREATE OR REPLACE`).

| Migration | What it does | Required before V2? |
|---|---|---|
| `009_ai_pipeline.sql` | Creates `ai_logs`, `structured_constraints`, `restaurant_cache`; adds v2 columns to `proposals`; enables RLS | **Yes** |
| `010_add_structured_constraint_columns.sql` | Adds `guest_id`, `weight_multiplier` to `structured_constraints`; idempotent UNIQUE on `invitation_id` | **Yes** |
| `011_v2_hardening.sql` | Updates `replace_proposals_and_advance` RPC to write v2 proposal columns; adds RLS COMMENT documentation | **Yes** |
| `012_event_categories.sql` | Adds `category` column to `events` | **Yes** |
| `013_ai_logs_month_index.sql` | Adds `idx_ai_logs_event_created` index on `ai_logs(event_id, created_at DESC)` — required for cost circuit breaker query performance | **Yes** |
| `014_invitation_slugs.sql` | Adds `slug` column to `invitations` for human-readable invite URLs | **Yes** |
| `015_funnel_and_flags.sql` | Creates `funnel_events` and `feature_flags` tables for analytics and per-user feature flags | **Yes** |

**Verification after applying:**
```sql
-- Confirm tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ai_logs', 'structured_constraints', 'restaurant_cache');

-- Confirm proposals v2 columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'proposals'
  AND column_name IN ('envy_scores', 'narrative_group', 'narrative_personal', 'confidence_score');

-- Confirm structured_constraints v2 columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'structured_constraints'
  AND column_name IN ('guest_id', 'weight_multiplier');
```

---

## 3. Pre-deployment: legacy path verification

Before enabling V2, confirm the legacy path is still healthy.

- [ ] Deploy code with `PIPELINE_V2=false`
- [ ] Trigger at least one event via the legacy path
- [ ] Confirm proposals are created correctly in the `proposals` table
- [ ] Confirm notifications sent successfully
- [ ] Check `usage_logs` for normal AI spend entries

---

## 4. Provider key validation (V2 only)

Before setting `PIPELINE_V2=true`, verify each provider:

**Anthropic:**
```bash
curl -s https://api.anthropic.com/v1/models \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" | jq '.data[0].id'
```

**Gemini:**
```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
  | jq '.models[0].name'
```

**Voyage AI:**
```bash
curl -s https://api.voyageai.com/v1/embeddings \
  -H "Authorization: Bearer $VOYAGE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":["test"],"model":"'$VOYAGE_MODEL'"}' \
  | jq '.data[0].embedding | length'
```

---

## 5. Staging rollout

Run a full V2 flow on a non-production event before any production traffic.

- [ ] Set `PIPELINE_V2=true` in staging environment only
- [ ] Create or select a test event with at least 2 guest preferences submitted
- [ ] POST `/api/events/{id}/trigger` and confirm 200 response
- [ ] Check `proposals` table — verify rows with non-null `narrative_group`, `envy_scores`, `confidence_score`
- [ ] Check `ai_logs` table — verify 5+ rows per pipeline run (one per stage that logs)
- [ ] Check `structured_constraints` table — verify rows with `dietary_hard`, `weight_multiplier`
- [ ] Check `restaurant_cache` table — verify rows with `vibe_embedding` populated
- [ ] Confirm `pipeline: 'v2'` in the trigger route response JSON
- [ ] Review `ai_logs` for any `error` column entries

---

## 6. Privacy checks

Before enabling V2 for real users:

- [ ] Confirm `PIPELINE_LOG_LEVEL=info` (not `debug`) in production — raw AI payloads must not be persisted
- [ ] Review one `ai_logs` row: `raw_input` and `raw_output` columns must be null (only written in debug mode)
- [ ] If you have access to Anthropic API logs: spot-check that message content does not contain invitation UUIDs (should only contain `guest_0`, `guest_1`, etc.)
- [ ] Confirm `narrative_personal` in the proposals table maps to invitation IDs as keys, not `guest_0` strings

---

## 7. Cost controls

Pipeline V2 makes up to 5 Anthropic calls + 1 Gemini call + 2 Voyage calls per trigger.

| Stage | Provider | Model | Typical token range |
|---|---|---|---|
| Dealbreaker detector | Anthropic | Haiku | ~500 in / ~200 out |
| Constraint extractor | Anthropic | Haiku | ~800 in / ~400 out |
| Reasoning engine | Anthropic | Sonnet | ~2000 in / ~1000 out + thinking tokens |
| Critic verifier | Anthropic | Haiku | ~1000 in / ~200 out |
| Narrative generator | Anthropic | Haiku | ~1200 in / ~500 out |
| Gemini discovery | Gemini | Flash | ~400 in / ~600 out |
| Vibe embedder | Voyage | voyage-3 | ~300 tokens per candidate |

**Estimated cost per trigger (V2):** ~$0.05–$0.15 USD depending on candidate count and reasoning depth.

Rate limits already in place (from legacy path):
- Per-user: 10 triggers per hour
- Per-event: 1 trigger per 5 minutes

These limits apply to V2 as well. No changes needed.

---

## 8. Monitoring checklist (ongoing)

After enabling V2, check these regularly:

- [ ] **Error rate:** `SELECT stage, count(*) FROM ai_logs WHERE error IS NOT NULL GROUP BY stage ORDER BY count DESC` — investigate any stage with persistent errors
- [ ] **Latency:** `SELECT stage, avg(latency_ms), max(latency_ms) FROM ai_logs GROUP BY stage` — reasoning engine >30s warrants investigation
- [ ] **Cost trend:** `SELECT date_trunc('day', created_at), sum(cost_micros)/1e6 AS dollars FROM ai_logs GROUP BY 1 ORDER BY 1` — alert if cost per day exceeds expected range
- [ ] **Proposal quality:** Spot-check that `narrative_group` is non-empty and readable
- [ ] **Legacy fallback:** Monitor that `PIPELINE_V2=false` events continue to work normally

---

## 9. Rollback procedure

**Full rollback (under 1 minute):**
1. Set `PIPELINE_V2=false` in environment variables
2. Redeploy (or if env var is hot-reloadable, no redeploy needed)
3. Confirm next trigger response does not include `pipeline: 'v2'`

**Rollback does not require:**
- DB migration reversal (all v2 tables and columns are additive)
- Code rollback (legacy path is unchanged and always active)

**When to rollback:**
- Pipeline error rate > 5% of triggers
- Anthropic/Gemini/Voyage provider outage
- Unexpected cost spike
- Any privacy concern

---

## 10. Rollout sequence (recommended)

```
Step 1: Apply migrations 009, 010, 011 with PIPELINE_V2=false
        → Verify legacy path still works

Step 2: Add all V2 provider env vars (GEMINI_API_KEY, GEMINI_MODEL, etc.)
        → Do not enable V2 yet

Step 3: Set PIPELINE_V2=true in staging
        → Run one test event
        → Verify proposals table, ai_logs, structured_constraints

Step 4: Set PIPELINE_V2=true for one internal production event
        → Review output quality and cost

Step 5: Limited production rollout
        → Monitor error rate, latency, cost for 24–48h
        → Expand only if metrics look normal

Step 6: Full rollout (when confident)
        → Keep PIPELINE_V2 as a permanent toggle for emergency rollback
```

---

## 11. Known deferred items (acceptable for initial rollout)

These do not block a controlled rollout but should be addressed before wide deployment:

| Item | Impact | Priority |
|---|---|---|
| Cohere reranker not integrated | Deterministic reranker used instead — still produces good results | Post-launch |
| Critic swap-and-rerun not implemented | Failed proposal removed (not replaced from alternates via re-reasoning) | Post-launch |
| `location_score = 0.5` placeholder | Location not weighted in scoring | Post-launch |
| `totalCostMicros = 0` in PipelineResult | Cost not aggregated per-run | Post-launch |
| `ANTHROPIC_EXTENDED_THINKING=false` default | Extended reasoning disabled by default | Enable after verifying beta on your account |
| Gemini `place_id` not canonical Google Maps ID | Candidates are model-knowledge-based, not verified Maps places | Future: integrate real Maps API |
| Menu Phantom Tier 2/3 not implemented | Dietary analysis is keyword-based only (Tier 1) | Future |
