'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  eventId: string;
  locationHint: string | null;
  eventStatus?: 'collecting' | 'deciding';
}

interface ErrorHint {
  title: string;
  body:  string;
  cta?:  { href: string; label: string };
}

function diagnose(eventId: string, raw: string, status: number): ErrorHint {
  const text = raw.toLowerCase();
  if (status === 422 && text.includes('preferences')) {
    return {
      title: 'No preferences submitted yet',
      body:  'At least one accepted guest needs to fill out their preferences before AI can synthesize. Share invite links and wait for responses.',
      cta:   { href: `/events/${eventId}/invite`, label: 'Manage invites' },
    };
  }
  if (status === 422 && text.includes('location')) {
    return {
      title: 'Location required',
      body:  'Set a location above (e.g. "Downtown Toronto, ON" or a neighborhood name) so we know where to search for venues.',
    };
  }
  if (status === 503) {
    return {
      title: 'API keys not configured',
      body:  'GOOGLE_PLACES_API_KEY and ANTHROPIC_API_KEY must be set in .env.local on the server.',
    };
  }
  if (text.includes('claude') && text.includes('json')) {
    return {
      title: 'AI response was malformed',
      body:  'Claude returned something we couldn\'t parse. This is usually transient — try again in a moment.',
    };
  }
  if (text.includes('no venues')) {
    return {
      title: 'No venues found',
      body:  'Google Places returned nothing for that location. Try a more specific or well-known area.',
    };
  }
  return { title: 'Synthesis failed', body: raw || 'Unknown error from the server.' };
}

const LOADING_STEPS = [
  'Searching venues nearby…',
  'Reading guest preferences…',
  'Asking Claude to rank picks…',
  'Almost there…',
];

export default function AITriggerButton({ eventId, locationHint, eventStatus = 'collecting' }: Props) {
  const router = useRouter();
  const isRerun = eventStatus === 'deciding';
  const [location, setLocation] = useState(locationHint ?? '');
  const [count,    setCount]    = useState(5);
  const [phase,    setPhase]    = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [stepIdx,  setStepIdx]  = useState(0);
  const [errHint,  setErrHint]  = useState<ErrorHint | null>(null);
  const [confirmingRerun, setConfirmingRerun] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);

  // Cycle through loading steps so the button doesn't feel frozen
  useEffect(() => {
    if (phase !== 'running') return;
    setStepIdx(0);
    const id = setInterval(() => setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1)), 2200);
    return () => clearInterval(id);
  }, [phase]);

  async function run() {
    if (!location.trim()) {
      setErrHint({ title: 'Location required', body: 'Type a city or neighborhood before running.' });
      setPhase('error');
      return;
    }
    if (isRerun && !confirmingRerun) {
      setConfirmingRerun(true);
      return;
    }
    setPhase('running');
    setErrHint(null);

    try {
      const res = await fetch(`/api/events/${eventId}/trigger`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ location_override: location, count, confirm_rerun: isRerun }),
      });

      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = typeof d.error === 'string' ? d.error : JSON.stringify(d.error ?? '');
        setErrHint(diagnose(eventId, errMsg, res.status));
        setPhase('error');
        return;
      }

      if (d.emails) {
        const { sent, failed } = d.emails as { sent: number; failed: number };
        if (failed > 0) setEmailNote(`⚠ ${failed} of ${sent + failed} notification emails failed.`);
      }

      setPhase('done');
      router.push(`/events/${eventId}/results`);
    } catch (err) {
      setErrHint({ title: 'Network error', body: err instanceof Error ? err.message : String(err) });
      setPhase('error');
    }
  }

  if (phase === 'done') return null;

  const running = phase === 'running';

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)',
      padding: '20px 24px', boxShadow: 'var(--sh)', animation: 'fu .4s var(--sp) .1s both', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: 'var(--fb)' }}>{isRerun ? 'Re-run AI Synthesis' : 'AI Synthesis'}</span>
        <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--lav)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '2px 7px', fontFamily: 'var(--fb)' }}>Powered by Claude</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 16px', lineHeight: 1.55 }}>
        {isRerun
          ? 'Generate a fresh set of picks. This will discard the current proposals and any votes guests have already cast.'
          : "Search real venues near your location, then have Claude rank them against everyone's preferences. Re-run anytime — old picks are replaced."}
      </p>

      {isRerun && confirmingRerun && phase === 'idle' && (
        <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 'var(--rs)', background: 'oklch(96% .04 72)', border: '1px solid oklch(82% .14 72)', fontSize: 12, color: 'oklch(38% .14 72)', fontFamily: 'var(--fb)', lineHeight: 1.5 }}>
          Heads up — existing proposals and votes will be wiped. Click <strong>Re-run AI</strong> again to confirm.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px auto', gap: 10, alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, fontFamily: 'var(--fb)' }}>Location</label>
          <input
            data-testid="ai-location-input"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Downtown Toronto, ON"
            disabled={running}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--rs)', fontSize: 13, fontFamily: 'var(--fb)', color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, fontFamily: 'var(--fb)' }}># of picks</label>
          <select
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            disabled={running}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--rs)', fontSize: 13, fontFamily: 'var(--fb)', color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box', appearance: 'none' }}
          >
            {[3, 4, 5, 6, 7, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button
          data-testid="ai-trigger-btn"
          onClick={run}
          disabled={running}
          style={{ padding: '9px 20px', borderRadius: 'var(--rs)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.7 : 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7 }}
        >
          {running ? (
            <>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid var(--bg)', borderTopColor: 'transparent', animation: 'sp2 .7s linear infinite' }} />
              {LOADING_STEPS[stepIdx]}
            </>
          ) : (
            <>{isRerun ? (confirmingRerun ? 'Confirm re-run' : 'Re-run AI') : 'Run AI'} →</>
          )}
        </button>
      </div>

      {phase === 'error' && errHint && (
        <div data-testid="ai-trigger-error" style={{ marginTop: 14, padding: '12px 14px', borderRadius: 'var(--rs)', background: 'oklch(96% .03 26)', border: '1px solid oklch(82% .12 26)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'oklch(40% .18 26)', fontFamily: 'var(--fb)' }}>{errHint.title}</div>
          <div style={{ fontSize: 12, color: 'oklch(38% .12 26)', fontFamily: 'var(--fb)', lineHeight: 1.5 }}>{errHint.body}</div>
          {errHint.cta && (
            <a href={errHint.cta.href} style={{ fontSize: 12, color: 'oklch(40% .18 26)', fontFamily: 'var(--fb)', fontWeight: 600, textDecoration: 'underline', alignSelf: 'flex-start', marginTop: 2 }}>
              {errHint.cta.label} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
