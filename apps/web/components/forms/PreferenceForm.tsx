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
  category: string;
}

function findPresetIndex(min?: number | null, max?: number | null): number | null {
  if (min == null && max == null) return null;
  const i = BUDGET_PRESETS.findIndex(p => p.min === min && p.max === max);
  return i === -1 ? null : i;
}

export default function PreferenceForm({ token, existing, category }: Props) {
  const router = useRouter();

  const [dietary,      setDietary]      = useState<string[]>(existing?.dietary ?? []);
  const [cuisinePrefs, setCuisinePrefs] = useState<string[]>(existing?.cuisine_prefs ?? []);
  const [cuisineAvoid, setCuisineAvoid] = useState<string[]>(existing?.cuisine_avoid ?? []);
  const [budgetIndex,  setBudgetIndex]  = useState<number | null>(findPresetIndex(existing?.budget_min, existing?.budget_max));
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
      method:  'POST',
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
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong');
      return;
    }

    router.push(`/invite/${token}`);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>

      <Section title="Dietary restrictions" hint="Hard constraints — no proposal will ignore these.">
        <ChipRow options={DIETARY_OPTIONS} active={dietary} onToggle={v => toggle(dietary, setDietary, v)} />
      </Section>

      <Section title="Cuisines you love">
        <ChipRow options={CUISINE_OPTIONS} active={cuisinePrefs} onToggle={v => toggle(cuisinePrefs, setCuisinePrefs, v)} />
      </Section>

      <Section title="Cuisines to avoid">
        <ChipRow options={CUISINE_OPTIONS} active={cuisineAvoid} onToggle={v => toggle(cuisineAvoid, setCuisineAvoid, v)} />
      </Section>

      <Section title="Budget per person">
        <ChipRow
          options={BUDGET_PRESETS.map(p => p.label)}
          active={budgetIndex != null ? [BUDGET_PRESETS[budgetIndex]!.label] : []}
          onToggle={(label) => {
            const i = BUDGET_PRESETS.findIndex(p => p.label === label);
            setBudgetIndex(budgetIndex === i ? null : i);
          }}
        />
      </Section>

      <Section title="Vibe">
        <ChipRow
          options={VIBE_OPTIONS}
          active={vibe ? [vibe] : []}
          onToggle={(v) => setVibe(vibe === v ? '' : v)}
        />
      </Section>

      <Section title="Anything else?" hint="Allergies, mobility needs, the one place you've been dying to try…">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for the host"
          rows={3}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--rs)', fontSize: 13, fontFamily: 'var(--fb)', color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        />
      </Section>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--rs)', background: 'oklch(96% .03 26)', border: '1px solid oklch(82% .12 26)' }}>
          <p style={{ fontSize: 12, color: 'oklch(40% .18 26)', fontFamily: 'var(--fb)', margin: 0 }}>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '13px 0', borderRadius: 'var(--rs)', border: 'none',
          background: 'var(--text)', color: 'var(--bg)',
          fontSize: 14, fontWeight: 600, fontFamily: 'var(--fb)',
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'opacity .15s',
        }}
      >
        {loading ? 'Saving…' : existing ? 'Update preferences' : 'Submit preferences'}
      </button>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--fb)', margin: 0, letterSpacing: '-.005em' }}>{title}</h2>
        {hint && <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '3px 0 0' }}>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function ChipRow({ options, active, onToggle }: { options: string[]; active: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => {
        const on = active.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            style={{
              padding: '10px 14px', borderRadius: 999,
              border: `1px solid ${on ? 'var(--text)' : 'var(--border2)'}`,
              background: on ? 'var(--text)' : 'var(--bg)',
              color: on ? 'var(--bg)' : 'var(--text)',
              fontSize: 12, fontWeight: 500, fontFamily: 'var(--fb)',
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => !on && (e.currentTarget.style.borderColor = 'var(--text)')}
            onMouseLeave={e => !on && (e.currentTarget.style.borderColor = 'var(--border2)')}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
