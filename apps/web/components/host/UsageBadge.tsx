'use client';

import { useEffect, useState } from 'react';

interface Totals {
  ai_synthesis?:  { cost_micros: number; count: number; input_tokens: number; output_tokens: number };
  venue_search?:  { cost_micros: number; count: number };
  photo_proxy?:   { cost_micros: number; count: number };
}

interface UsageData {
  totals:             Totals;
  total_cost_micros:  number;
  total_cost_display: string;
}

export default function UsageBadge({ eventId }: { eventId: string }) {
  const [data, setData] = useState<UsageData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/events/${eventId}/usage`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (alive && j) setData(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, [eventId]);

  if (!data || data.total_cost_micros === 0) return null;

  const ai = data.totals.ai_synthesis;
  const vs = data.totals.venue_search;

  return (
    <div style={{ marginBottom: 24, animation: 'fu .35s var(--sp) .15s both' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 'var(--rs)',
          background: 'var(--surface)', border: '1px solid var(--border2)',
          fontSize: 11, fontWeight: 500, color: 'var(--muted)', fontFamily: 'var(--fb)',
          cursor: 'pointer', boxShadow: 'var(--sh)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lav)' }} />
        Spent {data.total_cost_display} on this event
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M2 3l2.5 3L7 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ marginTop: 8, padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', boxShadow: 'var(--sh)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ai && (
            <Row label="AI synthesis (Claude)"
              cost={ai.cost_micros}
              meta={`${ai.count} run${ai.count === 1 ? '' : 's'} · ${ai.input_tokens.toLocaleString()} in / ${ai.output_tokens.toLocaleString()} out tokens`}
            />
          )}
          {vs && (
            <Row label="Venue search (Google Places)"
              cost={vs.cost_micros}
              meta={`${vs.count} request${vs.count === 1 ? '' : 's'}`}
            />
          )}
          <p style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0, opacity: 0.7 }}>
            Estimates from published rates. Actual billing may vary.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, cost, meta }: { label: string; cost: number; meta: string }) {
  const dollars = cost / 1_000_000;
  const display = dollars < 0.01 ? '<$0.01' : `$${dollars.toFixed(dollars < 1 ? 3 : 2)}`;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)' }}>{label}</div>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fb)', marginTop: 2 }}>{meta}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--fb)' }}>{display}</div>
    </div>
  );
}
