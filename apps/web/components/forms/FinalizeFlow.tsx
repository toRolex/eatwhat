'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface RankedProposal {
  id: string;
  rank: number;
  restaurant_name: string;
  restaurant_addr: string;
  cuisine_type: string;
  price_range: string;
  rating: number | null;
  vote_count: number;
  weighted_score: number;
}

interface Props {
  eventId:        string;
  proposedDate:   string | null;
  status:         'deciding' | 'finalized';
  finalizedId?:   string;
}

export default function FinalizeFlow({ eventId, proposedDate, status, finalizedId }: Props) {
  const router = useRouter();
  const [data, setData]         = useState<{ proposals: RankedProposal[]; total_voters: number } | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [time,     setTime]     = useState(() => defaultTime(proposedDate));
  const [notes,    setNotes]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState<string | null>(null);
  const [emailNote, setEmailNote] = useState<string | null>(null);

  // Poll the tally every 5s while still in 'deciding'
  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch(`/api/events/${eventId}/results`, { cache: 'no-store' });
      if (!res.ok || !alive) return;
      const json = await res.json();
      if (alive) setData(json);
    }
    load();
    if (status !== 'deciding') return;
    const id = setInterval(load, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [eventId, status]);

  if (!data) return <SkeletonTally />;

  const top = data.proposals[0];

  if (status === 'finalized') {
    return (
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '20px 24px', boxShadow: 'var(--sh)', marginTop: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: 'var(--fb)', marginBottom: 8 }}>Finalized</div>
        <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0 }}>
          The group settled on <strong style={{ color: 'var(--text)' }}>
            {data.proposals.find(p => p.id === finalizedId)?.restaurant_name ?? top?.restaurant_name ?? 'a winner'}
          </strong>. Calendar invites have gone out.
        </p>
        <a href={`/api/events/${eventId}/calendar`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--sky)', fontFamily: 'var(--fb)', textDecoration: 'none' }}>
          Download .ics →
        </a>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '20px 24px', boxShadow: 'var(--sh)', marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: 'var(--fb)' }}>Live tally</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>
          {data.total_voters} {data.total_voters === 1 ? 'voter' : 'voters'} so far
        </span>
      </div>

      {/* Tally bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        {data.proposals.map((p) => {
          const maxScore = Math.max(1, ...data.proposals.map(x => x.weighted_score));
          const pct = (p.weighted_score / maxScore) * 100;
          const picked = pickedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPickedId(picked ? null : p.id)}
              style={{
                position: 'relative', textAlign: 'left', padding: '10px 12px',
                borderRadius: 'var(--rs)', border: `1px solid ${picked ? 'var(--text)' : 'var(--border2)'}`,
                background: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--fb)',
                transition: 'border-color .15s, box-shadow .15s',
                boxShadow: picked ? '0 0 0 1px var(--text)' : 'none',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'var(--sage)', opacity: 0.12, width: `${pct}%`, borderRadius: 'var(--rs)', transition: 'width .4s var(--sp)' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.restaurant_name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {p.weighted_score} pts · {p.vote_count} {p.vote_count === 1 ? 'vote' : 'votes'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Finalize details */}
      <div style={{ borderTop: '1px solid var(--border2)', paddingTop: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', marginBottom: 10 }}>
          {pickedId ? 'Lock this pick in:' : 'Pick a restaurant above to finalize.'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, fontFamily: 'var(--fb)' }}>Confirmed time</label>
            <input
              type="datetime-local"
              value={time}
              onChange={e => setTime(e.target.value)}
              disabled={!pickedId || busy}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border2)', borderRadius: 'var(--rs)', fontSize: 13, fontFamily: 'var(--fb)', color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button
            disabled={!pickedId || busy || !time}
            onClick={async () => {
              if (!pickedId || !time) return;
              setBusy(true); setErr(null);
              const res = await fetch(`/api/events/${eventId}/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  proposal_id:    pickedId,
                  confirmed_time: new Date(time).toISOString(),
                  notes:          notes || undefined,
                }),
              });
              setBusy(false);
              const d = await res.json().catch(() => ({}));
              if (!res.ok) {
                setErr(typeof d.error === 'string' ? d.error : 'Finalize failed');
                return;
              }
              if (d.emails) {
                const { sent, failed } = d.emails as { sent: number; failed: number };
                if (failed > 0) setEmailNote(`⚠ ${failed} of ${sent + failed} notification emails failed — check server logs.`);
                else if (sent > 0) setEmailNote(`✓ ${sent} notification email${sent !== 1 ? 's' : ''} sent.`);
              }
              router.refresh();
            }}
            style={{
              padding: '9px 22px', borderRadius: 'var(--rs)', border: 'none',
              background: pickedId && !busy ? 'var(--text)' : 'var(--border2)',
              color: pickedId && !busy ? 'var(--bg)' : 'var(--muted)',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)',
              cursor: pickedId && !busy ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
            }}
          >
            {busy ? 'Locking…' : 'Finalize & notify'}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes for guests (parking, dress code…)"
          rows={2}
          disabled={!pickedId || busy}
          style={{ width: '100%', padding: '9px 12px', marginTop: 10, border: '1px solid var(--border2)', borderRadius: 'var(--rs)', fontSize: 12, fontFamily: 'var(--fb)', color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
        />
        {err && <p style={{ fontSize: 12, color: 'oklch(50% 0.18 26)', fontFamily: 'var(--fb)', margin: '8px 0 0' }}>{err}</p>}
        {emailNote && <p style={{ fontSize: 12, color: emailNote.startsWith('⚠') ? 'oklch(52% 0.16 72)' : 'oklch(46% 0.14 148)', fontFamily: 'var(--fb)', margin: '8px 0 0' }}>{emailNote}</p>}
      </div>
    </div>
  );
}

function defaultTime(iso: string | null): string {
  const base = iso ? new Date(iso) : (() => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(19, 0, 0, 0); return d; })();
  // datetime-local needs YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

function SkeletonTally() {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '20px 24px', boxShadow: 'var(--sh)', marginTop: 28 }}>
      <div style={{ height: 11, width: 80, background: 'var(--bg2)', borderRadius: 4, marginBottom: 14 }} />
      {[0, 1, 2].map(i => (
        <div key={i} style={{ height: 38, marginBottom: 8, background: 'var(--bg2)', borderRadius: 'var(--rs)', opacity: 0.6, animation: 'pulse 1.4s ease-in-out infinite both', animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  );
}
