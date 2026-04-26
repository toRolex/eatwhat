import type { SynthesisInput } from '../interface';

export function buildSynthesisPrompt(input: SynthesisInput): string {
  const { event, preferences, candidates } = input;
  const count = Math.max(3, Math.min(10, input.count ?? 5));

  const allDietary   = [...new Set(preferences.flatMap((p) => p.dietary))];
  const allAvoid     = [...new Set(preferences.flatMap((p) => p.cuisine_avoid))];
  const allPreferred = [...new Set(preferences.flatMap((p) => p.cuisine_prefs))];

  const budgets = preferences
    .map((p) => ({ min: p.budget_min, max: p.budget_max }))
    .filter((b) => b.min != null || b.max != null);

  const groupBudgetMin = budgets.length ? Math.max(...budgets.map((b) => b.min ?? 0)) : null;
  const groupBudgetMax = budgets.length ? Math.min(...budgets.map((b) => b.max ?? Infinity)) : null;

  return `You are a group restaurant recommendation engine.

Select exactly ${count} restaurants from the candidates below that best satisfy the group's collective constraints. Rank them 1 (best fit) through ${count}. Aim for variety across the picks — different cuisines, vibes, and price points where possible — so the group has a real choice.

CRITICAL RULES:
- Only select restaurants from the provided candidates list using their exact "id" field.
- Never invent, modify, or hallucinate restaurant data.
- Each candidate_id must appear at most once in your output.
- Dietary restrictions are hard constraints — do not propose a restaurant that cannot accommodate them.
- Cuisine preferences and vibe are soft constraints — use them for tie-breaking and to ensure variety.
- The reasoning field should be specific to the GROUP — call out which preferences or guests this pick caters to.

EVENT
Title: ${event.title}
Location: ${event.location_hint ?? 'Not specified'}
Date: ${event.proposed_date ?? 'Flexible'}

GROUP CONSTRAINTS (${preferences.length} guests)
Dietary restrictions (hard): ${allDietary.length ? allDietary.join(', ') : 'None'}
Cuisines to avoid: ${allAvoid.length ? allAvoid.join(', ') : 'None'}
Preferred cuisines: ${allPreferred.length ? allPreferred.join(', ') : 'No strong preference'}
Budget window: ${groupBudgetMin != null ? `$${(groupBudgetMin / 100).toFixed(0)}` : 'no min'} – ${groupBudgetMax != null && groupBudgetMax !== Infinity ? `$${(groupBudgetMax / 100).toFixed(0)}` : 'no max'} per person
Vibe preferences: ${preferences.map((p) => p.vibe_pref).filter(Boolean).join(', ') || 'None specified'}

CANDIDATES
${JSON.stringify(candidates, null, 2)}

Respond with ONLY valid JSON matching this exact schema — no markdown, no explanation outside the JSON:
{
  "proposals": [
    {
      "rank": 1,
      "candidate_id": "<id from candidates>",
      "reasoning": "<1–2 sentences explaining why this restaurant fits the group>",
      "constraints_met": { "<constraint label>": true },
      "constraints_gap": { "<constraint label>": "<brief note on the gap>" },
      "suggested_time": null
    }
    // ...continue through rank ${count}
  ]
}`;
}
