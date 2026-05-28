# GroupPlan — Project State

Read this before planning any feature. Keep it current after each session.

---

## Current phase

**Deployment readiness.** All pipeline V2 implementation is complete. No more feature work until the first production rollout succeeds.

---

## What exists today

### AI Pipeline V2

12-stage multi-provider pipeline replacing the legacy single-shot Haiku call. Feature-flagged behind `PIPELINE_V2=false`.

Stages: dealbreaker-detector → implicit-inference → constraint-extractor → gemini-maps-grounding → menu-phantom → deterministic-scorer → vibe-embedder → reranker → fairness-checker → reasoning-engine → critic-verifier → narrative-generator

All 12 stages are implemented and wired through the orchestrator at `packages/ai/src/pipeline/orchestrator.ts`.

### Tests

- 248/248 unit + integration tests pass
- 48 Playwright visual regression tests in `tools/qa/` (12 pages × 2 viewports × 2 themes)
- Run visual suite: `pnpm qa:visual`

### Schema (migrations applied to production)

| Migration | Status |
|---|---|
| 009_ai_pipeline.sql | Applied |
| 010_add_structured_constraint_columns.sql | Applied |
| 011_v2_hardening.sql | Applied |
| 012_event_categories.sql | Applied |
| 013_ai_logs_month_index.sql | Applied |
| 014_invitation_slugs.sql | Applied |
| 015_funnel_and_flags.sql | Applied |

### Cost controls

- Monthly cost circuit breaker live: `POST /api/events/[id]/trigger` returns HTTP 402 when monthly spend ≥ `PIPELINE_COST_CAP_MICROS` (default $5.00/event/month)
- `/dev/costs` shows "Spend caps — current month" panel
- `usage_log` cost tracking reads real cost from `ai_logs` after each run

---

## Open decisions / known gaps

| Item | Status |
|---|---|
| Cohere reranker | Deferred — deterministic reranker in use |
| Critic swap-and-rerun | Deferred — failed proposal removed, not swapped |
| Menu Phantom Tier 2/3 | Deferred |
| Canonical Google Maps place IDs | Deferred — Gemini slugs used |
| `totalCostMicros` in PipelineResult | Deferred — always 0 |
| `database.types.ts` regeneration | Deferred |
| `location_score` | Placeholder 0.5 — not weighted |

---

## Next step

Run the deployment checklist at `docs/PIPELINE_V2_DEPLOYMENT_CHECKLIST.md`. Do not add features until after the first production rollout succeeds.

---

## Architecture reference

`docs/PIPELINE_V2_CONTEXT.md` — full authoritative reference including stage specs, interfaces, and conventions.
