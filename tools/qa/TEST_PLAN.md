# GroupPlan QA Test Plan

## System overview

Six test layers, executed in order of cost:

| Layer | Tool | When |
|---|---|---|
| 0 | `data-testid` attributes in components | One-time pass; prerequisite for all layers |
| 1 | Vitest unit + route tests | Every PR via CI |
| 2 | Vitest DB integration tests | Every PR via CI |
| 3 | Playwright E2E checklist | Every PR via CI |
| 4 | Playwright visual regression | Every PR via CI |
| 5 | axe-playwright accessibility | Every PR via CI |

---

## Layer 0 — data-testid attribute map

Add `data-testid` exactly as specified. Do not change any other attribute. Do not rename `id` or `name` attributes.

### `components/forms/MagicLinkForm.tsx`

| Element | Selector hint | `data-testid` |
|---|---|---|
| Email input | `id="email"` | `magic-link-email` |
| Submit button | `type="submit"` | `magic-link-submit` |
| Error paragraph | conditional render | `magic-link-error` |

### `components/forms/EventCreateForm.tsx`

| Element | Selector hint | `data-testid` |
|---|---|---|
| Title input | `id="title"` | `event-title-input` |
| Description textarea | `id="description"` | `event-description-input` |
| Location input | `id="location"` | `event-location-input` |
| RSVP deadline input | `id="deadline"` | `event-deadline-input` |
| Proposed date input | `id="proposed-date"` | `event-proposed-date-input` |
| Vote deadline input | `id="vote-deadline"` | `event-vote-deadline-input` |
| Date flexible toggle button | `type="button"` text "Date flexible" | `event-date-flexible-toggle` |
| Category button — dinner | `type="button"` text "Dinner" | `event-category-dinner` |
| Category button — activity | `type="button"` text "Activity" | `event-category-activity` |
| Category button — movie | `type="button"` text "Movie" | `event-category-movie` |
| Template button — classic | `type="button"` text "Classic" | `event-template-classic` |
| Template button — minimal | `type="button"` text "Minimal" | `event-template-minimal` |
| Template button — gradient | `type="button"` text "Gradient" | `event-template-gradient` |
| Submit button | `type="submit"` text "Create event" | `event-create-submit` |
| Inline error paragraph | conditional render | `event-create-error` |

### `components/forms/InviteManager.tsx`

| Element | Selector hint | `data-testid` |
|---|---|---|
| Guest name input | `placeholder="Alex"` | `invite-name-input` |
| Guest email input | `type="email"` | `invite-email-input` |
| Add guest submit button | `type="submit"` | `invite-add-submit` |
| Guest list container | wraps all guest rows | `invite-guest-list` |
| Each guest row | repeated | `invite-guest-row` |
| Copy link button (per guest) | "Copy link" text | `invite-copy-link` (one per row, inside `invite-guest-row`) |
| Inline error paragraph | conditional render | `invite-add-error` |

### `components/forms/AITriggerButton.tsx`

| Element | Selector hint | `data-testid` |
|---|---|---|
| Location override input | location input | `ai-location-input` |
| Run AI / trigger button | primary CTA | `ai-trigger-btn` |
| Confirm rerun button | shown on 409 response | `ai-confirm-rerun-btn` |
| Error message | conditional render | `ai-trigger-error` |
| Success / proposals ready message | conditional render | `ai-trigger-success` |

### `components/forms/FinalizeFlow.tsx`

| Element | Selector hint | `data-testid` |
|---|---|---|
| Finalize button | opens confirm UI | `finalize-btn` |
| Confirm finalize button | inside confirm modal/section | `finalize-confirm-btn` |
| Cancel button | inside confirm UI | `finalize-cancel-btn` |

### `components/forms/PreferenceForm.tsx`

| Element | Selector hint | `data-testid` |
|---|---|---|
| Cuisine chip buttons | togglable buttons | `pref-cuisine-{label}` (lowercase, spaces→hyphens) |
| Budget select or chips | budget options | `pref-budget-{level}` |
| Notes textarea | free text | `pref-notes-input` |
| Submit button | `type="submit"` | `pref-submit` |
| Success message | conditional render | `pref-success` |
| Error message | conditional render | `pref-error` |

### `components/forms/RSVPForm.tsx` (if applicable to invite flow)

| Element | Selector hint | `data-testid` |
|---|---|---|
| Accept button | primary CTA | `rsvp-accept-btn` |
| Decline button | secondary action | `rsvp-decline-btn` |

### `components/voting/VotingInterface.tsx`

| Element | Selector hint | `data-testid` |
|---|---|---|
| Each rank input / select | repeated per proposal | `vote-rank-{n}` (1-indexed) |
| Submit vote button | `type="submit"` | `vote-submit` |
| Success message | post-submit | `vote-success` |
| Error message | conditional render | `vote-error` |

### Pages

#### `app/(host)/dashboard/page.tsx`

| Element | `data-testid` |
|---|---|
| New event link/button | `dashboard-new-event-btn` |
| Event list container | `dashboard-event-list` |
| Each event card | `dashboard-event-card` |

#### `app/(host)/events/[id]/page.tsx`

| Element | `data-testid` |
|---|---|
| Status badge | `event-status-badge` |
| Manage invites link/button | `event-manage-invites-btn` |
| View results link (conditional) | `event-view-results-btn` |

#### `app/invite/[slug]/page.tsx`

| Element | `data-testid` |
|---|---|
| Accept invite button / component | `invite-accept-btn` |
| Update preferences link (conditional) | `invite-update-prefs-link` |

---

## Layer 1 — API route tests

File convention: `app/api/[path]/route.test.ts` alongside each route file.  
Use vitest + `@/lib/supabase/server` mock (see existing `auth/callback/route.test.ts` for pattern).

### Test matrix

#### `POST /api/auth/magic-link`

| Case | Input | Expected |
|---|---|---|
| Valid email | `{ email: "user@example.com" }` | 200, `{ ok: true }` |
| Missing email | `{}` | 400 |
| Invalid email format | `{ email: "notanemail" }` | 400 |
| Supabase error | mock Supabase to throw | 500 or 503 |

#### `GET /api/auth/me`

| Case | Expected |
|---|---|
| Authenticated | 200, `{ user: { id, email } }` |
| Unauthenticated | 401 |

#### `GET /api/events`

| Case | Expected |
|---|---|
| Authenticated, has events | 200, array |
| Authenticated, no events | 200, `[]` |
| Unauthenticated | 401 |

#### `POST /api/events`

| Case | Input | Expected |
|---|---|---|
| Valid — minimum fields | `{ title, rsvp_deadline }` | 201, `{ event: { id } }` |
| Valid — all fields | full payload | 201 |
| Missing title | `{ rsvp_deadline }` | 400 |
| Missing rsvp_deadline | `{ title }` | 400 |
| Invalid deadline (past date) | past ISO string | 422 |
| Unauthenticated | any | 401 |

#### `GET /api/events/[id]`

| Case | Expected |
|---|---|
| Owner, event exists | 200 |
| Non-owner | 404 |
| Not found | 404 |
| Unauthenticated | 401 |

#### `PATCH /api/events/[id]`

| Case | Input | Expected |
|---|---|---|
| Valid patch | `{ title: "New title" }` | 200 |
| Non-owner | valid body | 404 |
| Unauthenticated | any | 401 |

#### `POST /api/events/[id]/trigger`

| Case | Expected |
|---|---|
| Status not `collecting`/`deciding` | 422 |
| Status `deciding`, no `confirm_rerun` | 409, `code: "rerun_confirmation_required"` |
| No preferences yet | 422, "No preferences" |
| No location | 422, "No location" |
| Venue search fails | 503 |
| AI synthesis fails | 503 |
| User rate limit exceeded | 429 |
| Event rate limit exceeded | 429 |
| Spend cap exceeded (v2) | 402 |
| Unauthenticated | 401 |
| Non-owner | 404 |

#### `POST /api/events/[id]/finalize`

| Case | Expected |
|---|---|
| Valid, owner, has proposals | 200 |
| No proposals | 422 |
| Already finalized | 422 |
| Non-owner | 404 |
| Unauthenticated | 401 |

#### `POST /api/events/[id]/invite`

| Case | Input | Expected |
|---|---|---|
| Valid invite | `{ name, email }` | 201, `{ invitation: { slug } }` |
| Missing name | `{ email }` | 400 |
| Missing email | `{ name }` | 400 |
| Duplicate email | same email twice | 409 |
| Non-owner | valid body | 404 |
| Unauthenticated | any | 401 |

#### `GET /api/invite/[slug]`

| Case | Expected |
|---|---|
| Valid slug | 200, invitation + event data |
| Invalid / not found slug | 404 |

#### `POST /api/invite/[slug]/accept`

| Case | Expected |
|---|---|
| Valid, unauthenticated | 200, sets session cookie or redirects |
| Already accepted | 200 (idempotent) |
| Event closed (past deadline) | 422 |
| Invalid slug | 404 |

#### `POST /api/invite/[slug]/preferences`

| Case | Input | Expected |
|---|---|---|
| Valid preferences | `{ dietary_restrictions, budget, notes }` | 200 |
| Empty body | `{}` | 400 |
| Invalid slug | any | 404 |
| Invite not accepted yet | any | 403 |

#### `POST /api/invite/[slug]/rsvp`

| Case | Input | Expected |
|---|---|---|
| Accept | `{ status: "accepted" }` | 200 |
| Decline | `{ status: "declined" }` | 200 |
| Invalid status | `{ status: "maybe" }` | 400 |
| Invalid slug | any | 404 |

#### `POST /api/events/[id]/proposals/[pid]/vote`

| Case | Expected |
|---|---|
| Valid rankings | 200 |
| Wrong number of rankings | 400 |
| Duplicate rankings | 400 |
| Event not in `deciding` status | 422 |
| Unauthenticated / not a guest | 403 |

#### `POST /api/demo/synthesize`

| Case | Expected |
|---|---|
| AI unavailable (no key) | 503, `{ error: "AI synthesis unavailable…" }` |
| Valid call with key | 200, proposals array |

---

## Layer 2 — DB integration tests

File: `packages/db/src/__tests__/` (one file per domain).  
Run against a local Supabase instance (`supabase start`). Each test seeds, asserts, and tears down.

### Coverage areas

- `events.test.ts` — createEvent, getEventById, getEventBySlug, updateEvent, deleteEvent
- `invitations.test.ts` — createInvitation, getInvitationBySlug, updateInvitationStatus, getInvitationsByEvent
- `preferences.test.ts` — upsertPreferences, getPreferencesByEvent
- `proposals.test.ts` — replaceProposalsAndAdvance (verifies cascade delete of old votes)
- `votes.test.ts` — upsertVote, getVotesByEvent
- `rls.test.ts` — verify non-owner cannot read/write another user's events

---

## Layer 3 — E2E checklist (updated selectors)

Update `qa-runner/qa-checklist.mjs` to use `data-testid` selectors once Layer 0 is complete:

| Old selector | New selector |
|---|---|
| `#title` | `[data-testid="event-title-input"]` |
| `#location` | `[data-testid="event-location-input"]` |
| `#deadline` | `[data-testid="event-deadline-input"]` |
| `button[type='submit']` (create form) | `[data-testid="event-create-submit"]` |
| `button:has-text('Run AI')` | `[data-testid="ai-trigger-btn"]` |
| `button:has-text('Finalize')` | `[data-testid="finalize-btn"]` |
| `button:has-text('Add guest')` | `[data-testid="invite-add-submit"]` |
| `input[name='guestName']` | `[data-testid="invite-name-input"]` |
| `input[type='email']` (invite) | `[data-testid="invite-email-input"]` |
| `button:has-text('Copy invite link')` | `[data-testid="invite-copy-link"]` |
| `button[type='submit']` (pref form) | `[data-testid="pref-submit"]` |
| `button[type='submit']` (vote form) | `[data-testid="vote-submit"]` |
| `button:has-text('Accept invite')` | `[data-testid="invite-accept-btn"]` |

---

## Layer 4 — Visual regression

Install `@playwright/test` visual comparison in the QA runner. For each key page, take a screenshot on first run to generate the baseline, then compare on subsequent runs.

Pages to snapshot:

| Route | Snapshot name | Viewport |
|---|---|---|
| `/login` | `login` | 1280×800, 390×844 |
| `/dashboard` (authenticated) | `dashboard` | 1280×800 |
| `/events/new` | `events-new` | 1280×800 |
| `/events/[id]` (collecting) | `event-detail-collecting` | 1280×800 |
| `/events/[id]` (deciding) | `event-detail-deciding` | 1280×800 |
| `/invite/[slug]` (valid) | `invite-landing` | 1280×800, 390×844 |
| `/invite/[slug]/preferences` | `invite-preferences` | 1280×800 |
| `/invite/[slug]/vote` | `invite-vote` | 1280×800 |

---

## Layer 5 — Accessibility

Add `axe-playwright` to the QA runner. After each page navigation in the E2E flow, run `checkA11y` and add failures as QA check entries.

Critical rules to enforce: `color-contrast`, `label`, `button-name`, `image-alt`, `link-name`.

---

## Seed data requirements

The E2E runner depends on these being present in the dev database before the run.

### Host user
- Email: `anderson.mcalpine@gmail.com` (existing, created via magic link)

### Seed event — "deciding" status (for re-run and finalize tests)
- ID: `028d68fa-4900-4bc1-891e-e4d84d2014f0` (existing `TEST_EVENT_ID` in checklist)
- Status: `deciding`
- Has at least 3 proposals
- Has at least 1 accepted invitation
- Owned by the host user

### Seed event — "collecting" status (for create-flow cascade)
- Created fresh per run by the HOST-1 flow; no pre-seed needed

### Seed invitations
- At least one accepted invitation on the deciding-status event so GUEST flow can navigate to a valid `/invite/[slug]`
- The slug must be stable (not change between runs); bake it into the seed script

### Seed script
Add `qa-runner/seed.mjs` that calls the dev API to (re-)create the deciding-status event + proposals + one accepted invitation if they don't exist. Run it once before the full checklist.

---

## CI integration

`.github/workflows/qa.yml`:

```yaml
name: QA
on: [pull_request]
jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: supabase start
      - run: pnpm --filter @groupplan/web dev &
      - run: npx wait-on http://localhost:3000
      - run: node qa-runner/seed.mjs
      - run: node qa-runner/qa-checklist.mjs
      - run: pnpm --filter @groupplan/web vitest run
```

---

## Implementation order for Cursor

1. **Layer 0**: Add all `data-testid` attributes from the map above. One commit per component file. Do not change any logic.
2. **Layer 1**: Write route test files. Start with the trigger route (most complex) and auth routes. Use the existing `auth/callback/route.test.ts` as the pattern.
3. **Layer 3**: Update `qa-checklist.mjs` selectors to use `data-testid` values from the table above (after Layer 0 is merged).
4. **Layer 2**: DB integration tests. Requires `supabase start` to be working locally.
5. **Layers 4–5**: Visual and a11y. Add after the core test suite is stable.
