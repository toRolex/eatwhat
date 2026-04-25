'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  eventId: string;
  locationHint: string | null;
}

export default function AITriggerButton({ eventId, locationHint }: Props) {
  const router = useRouter();
  const [location, setLocation] = useState(locationHint ?? '');
  const [phase, setPhase]       = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [error, setError]       = useState('');

  async function run() {
    if (!location.trim()) { setError('Enter a location first'); return; }
    setPhase('running'); setError('');

    const res = await fetch(`/api/events/${eventId}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location_override: location }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Synthesis failed');
      setPhase('error');
      return;
    }

    setPhase('done');
    router.push(`/events/${eventId}/results`);
  }

  if (phase === 'done') return null;

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '20px 24px', boxShadow: 'var(--sh)', animation: 'fu .4s var(--sp) .1s both' }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10, fontFamily: 'var(--fb)' }}>AI Synthesis</div>
      <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 14px', lineHeight: 1.55 }}>
        Search real venues via Yelp, then let Claude rank them against your group's preferences.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, fontFamily: 'var(--fb)' }}>Location</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Downtown Toronto, ON"
            disabled={phase === 'running'}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--rs)', fontSize: 13, fontFamily: 'var(--fb)', color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          />
        </div>
        <button
          onClick={run}
          disabled={phase === 'running'}
          style={{ padding: '9px 20px', borderRadius: 'var(--rs)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', cursor: phase === 'running' ? 'not-allowed' : 'pointer', opacity: phase === 'running' ? 0.6 : 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7 }}
        >
          {phase === 'running' ? (
            <>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid var(--bg)', borderTopColor: 'transparent', animation: 'sp2 .7s linear infinite' }} />
              Running…
            </>
          ) : (
            <>✦ Run AI</>
          )}
        </button>
      </div>
      {error && (
        <p style={{ fontSize: 12, color: 'oklch(50% 0.18 26)', fontFamily: 'var(--fb)', margin: '10px 0 0' }}>{error}</p>
      )}
    </div>
  );
}
