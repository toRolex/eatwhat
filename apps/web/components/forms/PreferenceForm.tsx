'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GuestPreferences } from '@groupplan/types';

const DIETARY_OPTIONS   = ['Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'Nut-free', 'Dairy-free'];
const CUISINE_OPTIONS   = ['Italian', 'Japanese', 'Mexican', 'Indian', 'Thai', 'Chinese', 'Mediterranean', 'American', 'French', 'Korean'];
const VIBE_OPTIONS      = ['Casual', 'Fine dining', 'Trendy/buzzy', 'Quiet', 'Family-friendly', 'Outdoor seating'];
const BUDGET_PRESETS    = [
  { label: 'Under $20', min: 0,    max: 2000  },
  { label: '$20–$40',   min: 2000, max: 4000  },
  { label: '$40–$70',   min: 4000, max: 7000  },
  { label: '$70+',      min: 7000, max: null  },
];

interface Props {
  token: string;
  existing: GuestPreferences | null;
}

export default function PreferenceForm({ token, existing }: Props) {
  const router = useRouter();

  const [dietary,      setDietary]      = useState<string[]>(existing?.dietary ?? []);
  const [cuisinePrefs, setCuisinePrefs] = useState<string[]>(existing?.cuisine_prefs ?? []);
  const [cuisineAvoid, setCuisineAvoid] = useState<string[]>(existing?.cuisine_avoid ?? []);
  const [budgetIndex,  setBudgetIndex]  = useState<number | null>(null);
  const [vibe,         setVibe]         = useState(existing?.vibe_pref ?? '');
  const [notes,        setNotes]        = useState(existing?.notes ?? '');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const budget = budgetIndex != null ? BUDGET_PRESETS[budgetIndex] : null;

    const res = await fetch(`/api/invite/${token}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dietary,
        cuisine_prefs: cuisinePrefs,
        cuisine_avoid: cuisineAvoid,
        budget_min:    budget?.min ?? undefined,
        budget_max:    budget?.max ?? undefined,
        vibe_pref:     vibe || undefined,
        notes:         notes || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Something went wrong');
      return;
    }

    router.push(`/invite/${token}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-800">Dietary restrictions</h2>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt}
              label={opt}
              active={dietary.includes(opt)}
              onToggle={() => toggle(dietary, setDietary, opt)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-800">Cuisines you love</h2>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt}
              label={opt}
              active={cuisinePrefs.includes(opt)}
              onToggle={() => toggle(cuisinePrefs, setCuisinePrefs, opt)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-800">Cuisines to avoid</h2>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt}
              label={opt}
              active={cuisineAvoid.includes(opt)}
              onToggle={() => toggle(cuisineAvoid, setCuisineAvoid, opt)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-800">Budget per person</h2>
        <div className="flex flex-wrap gap-2">
          {BUDGET_PRESETS.map((preset, i) => (
            <ToggleChip
              key={preset.label}
              label={preset.label}
              active={budgetIndex === i}
              onToggle={() => setBudgetIndex(budgetIndex === i ? null : i)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-800">Vibe</h2>
        <div className="flex flex-wrap gap-2">
          {VIBE_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt}
              label={opt}
              active={vibe === opt}
              onToggle={() => setVibe(vibe === opt ? '' : opt)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-800">Anything else?</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Allergies, mobility needs, special requests…"
          rows={3}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
        />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Saving…' : 'Submit preferences'}
      </button>
    </form>
  );
}

function ToggleChip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-zinc-900 text-white border-zinc-900'
          : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500'
      }`}
    >
      {label}
    </button>
  );
}
