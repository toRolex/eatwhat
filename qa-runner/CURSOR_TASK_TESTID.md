# Cursor task: add data-testid attributes (Layer 0)

## What to do

Add `data-testid` attributes to the elements listed below. That is the **only** change you should make to each file. Do not rename variables, change logic, add comments, reformat code, or touch any file not listed.

---

## File 1 — `apps/web/components/forms/MagicLinkForm.tsx`

```
email input          → data-testid="magic-link-email"
submit button        → data-testid="magic-link-submit"
error paragraph      → data-testid="magic-link-error"
```

---

## File 2 — `apps/web/components/forms/EventCreateForm.tsx`

```
#title input                     → data-testid="event-title-input"
#description textarea            → data-testid="event-description-input"
#location input                  → data-testid="event-location-input"
#deadline input                  → data-testid="event-deadline-input"
#proposed-date input             → data-testid="event-proposed-date-input"
#vote-deadline input             → data-testid="event-vote-deadline-input"
"Date flexible" toggle button    → data-testid="event-date-flexible-toggle"
category button: Dinner          → data-testid="event-category-dinner"
category button: Activity        → data-testid="event-category-activity"
category button: Movie           → data-testid="event-category-movie"
template button: Classic         → data-testid="event-template-classic"
template button: Minimal         → data-testid="event-template-minimal"
template button: Gradient        → data-testid="event-template-gradient"
submit button ("Create event")   → data-testid="event-create-submit"
error paragraph                  → data-testid="event-create-error"
```

---

## File 3 — `apps/web/components/forms/InviteManager.tsx`

```
name input                       → data-testid="invite-name-input"
email input                      → data-testid="invite-email-input"
add guest submit button          → data-testid="invite-add-submit"
guest list container div         → data-testid="invite-guest-list"
each guest row div               → data-testid="invite-guest-row"
each "Copy link" button          → data-testid="invite-copy-link"
error paragraph                  → data-testid="invite-add-error"
```

---

## File 4 — `apps/web/components/forms/AITriggerButton.tsx`

```
location input                   → data-testid="ai-location-input"
Run AI / trigger button          → data-testid="ai-trigger-btn"
confirm rerun button             → data-testid="ai-confirm-rerun-btn"
error message element            → data-testid="ai-trigger-error"
success / proposals-ready msg    → data-testid="ai-trigger-success"
```

---

## File 5 — `apps/web/components/forms/FinalizeFlow.tsx`

```
open-finalize button             → data-testid="finalize-btn"
confirm finalize button          → data-testid="finalize-confirm-btn"
cancel button                    → data-testid="finalize-cancel-btn"
```

---

## File 6 — `apps/web/components/forms/PreferenceForm.tsx`

```
each cuisine chip button         → data-testid="pref-cuisine-{label}"
  (lowercase label, spaces → hyphens, e.g. "Gluten-Free" → "pref-cuisine-gluten-free")
each budget option               → data-testid="pref-budget-{level}"
  (e.g. "$" → "pref-budget-1", "$$" → "pref-budget-2", "$$$" → "pref-budget-3")
notes textarea                   → data-testid="pref-notes-input"
submit button                    → data-testid="pref-submit"
success message                  → data-testid="pref-success"
error message                    → data-testid="pref-error"
```

---

## File 7 — `apps/web/components/voting/VotingInterface.tsx`

```
each rank input/select           → data-testid="vote-rank-{n}" (n = 1, 2, 3, …)
submit vote button               → data-testid="vote-submit"
success message                  → data-testid="vote-success"
error message                    → data-testid="vote-error"
```

---

## File 8 — `apps/web/app/(host)/dashboard/page.tsx`

```
"New event" link or button       → data-testid="dashboard-new-event-btn"
event list container             → data-testid="dashboard-event-list"
each event card                  → data-testid="dashboard-event-card"
```

---

## File 9 — `apps/web/app/(host)/events/[id]/page.tsx`

```
status badge element             → data-testid="event-status-badge"
"Manage invites" link/button     → data-testid="event-manage-invites-btn"
"View results" link (conditional)→ data-testid="event-view-results-btn"
```

---

## File 10 — `apps/web/app/invite/[slug]/page.tsx`

```
accept invite button/component   → data-testid="invite-accept-btn"
"Update preferences" link        → data-testid="invite-update-prefs-link"
```

---

## Verification

After making the changes, run:

```bash
grep -r 'data-testid' apps/web/components/forms/ apps/web/app/\(host\)/ apps/web/app/invite/
```

Every `data-testid` value listed above should appear exactly once in the output.

---

## What NOT to do

- Do not change any logic, state, or event handlers
- Do not reformat or reorder JSX
- Do not add or remove imports
- Do not touch any file not listed above
- Do not add comments
- Do not change `id` or `name` attributes
