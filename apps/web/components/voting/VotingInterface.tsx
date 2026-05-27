'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Proposal } from '@groupplan/types';

interface Props {
  proposals:        Proposal[];
  token:            string;
  initialRankings?: Record<string, number>;
}

interface Tally {
  proposal_id:    string;
  vote_count:     number;
  weighted_score: number;
}

const ACCENT = ['var(--amber)', 'var(--sage)', 'var(--sky)', 'var(--coral)', 'var(--lav)', 'var(--amber)', 'var(--sage)', 'var(--sky)', 'var(--coral)', 'var(--lav)'];

export default function VotingInterface({ proposals, token, initialRankings }: Props) {
  const N = proposals.length;
  const ranks = useMemo(() => Array.from({ length: N }, (_, i) => i + 1), [N]);

  const hasPriorVotes = !!initialRankings && Object.keys(initialRankings).length === N;
  const [editing,   setEditing]  = useState(!hasPriorVotes);
  const [rankings,  setRankings] = useState<Record<string, number>>(initialRankings ?? {});
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState<string | null>(null);
  const [tally,     setTally]    = useState<Tally[] | null>(null);
  // Tracks whether a vote submission is still in flight so the tally poll
  // doesn't overwrite rankings state with a stale server snapshot.
  const submitting = useRef(false);

  // Pull live tally while showing the already-voted view.
  // Paused automatically while editing (setEditing(true)) and during submission.
  useEffect(() => {
    if (editing) return;
    let alive = true;
    async function load() {
      if (submitting.current) return; // don't race a mid-flight submit
      const res = await fetch(`/api/invite/${token}/tally`, { cache: 'no-store' });
      if (!res.ok || !alive) return;
      const json = await res.json();
      if (alive && !submitting.current) setTally(json.tally ?? []);
    }
    load();
    const id = setInterval(load, 4000);
    return () => { alive = false; clearInterval(id); };
  }, [editing, token]);

  function assignRank(proposalId: string, rank: number) {
    setRankings(prev => {
      const next = { ...prev };
      for (const [pid, r] of Object.entries(next)) {
        if (r === rank && pid !== proposalId) delete next[pid];
      }
      next[proposalId] = rank;
      return next;
    });
  }

  const allRanked = proposals.every(p => p.id in rankings);

  async function submitVotes() {
    if (!allRanked) return;
    setLoading(true);
    setError(null);
    submitting.current = true;

    const results = await Promise.allSettled(
      Object.entries(rankings).map(([pid, rank]) =>
        fetch(`/api/events/${proposals[0]!.event_id}/proposals/${pid}/vote`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'x-invite-token': token },
          body:    JSON.stringify({ rank }),
        }).then(r => { if (!r.ok) throw new Error(`Vote ${pid} failed`); }),
      ),
    );

    submitting.current = false;
    setLoading(false);

    if (results.some(r => r.status === 'rejected')) {
      setError('Some votes failed — please try again.');
      return;
    }

    // Flip to read view immediately with the rankings the user just set.
    // The next tally poll (≤4s) will reflect the committed votes from the server.
    // We deliberately don't router.refresh() here — that risks returning stale
    // initialRankings from the RSC if the DB write hasn't propagated yet.
    setEditing(false);
  }

  // Already voted view — show their rankings and the live tally
  if (!editing) {
    const myByProposal = rankings;
    const sortedByMyRank = [...proposals].sort((a, b) => (myByProposal[a.id] ?? 99) - (myByProposal[b.id] ?? 99));
    const maxScore = Math.max(1, ...(tally?.map(t => t.weighted_score) ?? [1]));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div data-testid="vote-success" style={{ padding: '12px 14px', borderRadius: 'var(--rs)', background: 'oklch(96% .04 148)', border: '1px solid oklch(82% .12 148)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'oklch(36% .13 148)', fontFamily: 'var(--fb)', marginBottom: 2 }}>
            ✓ Your votes are in
          </div>
          <p style={{ fontSize: 12, color: 'oklch(38% .12 148)', fontFamily: 'var(--fb)', margin: 0 }}>
            Live tally below — updates as other guests vote. You can re-rank anytime before the host finalizes.
          </p>
        </div>

        {sortedByMyRank.map((p) => {
          const myRank = myByProposal[p.id];
          const t      = tally?.find(x => x.proposal_id === p.id);
          const pct    = t ? (t.weighted_score / maxScore) * 100 : 0;
          return (
            <div key={p.id} style={{ position: 'relative', overflow: 'hidden', background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '14px 16px', boxShadow: 'var(--sh)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'var(--sage)', opacity: 0.08, width: `${pct}%`, transition: 'width .4s var(--sp)' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'var(--fb)', flexShrink: 0 }}>
                  #{myRank}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--fb)' }}>{p.restaurant_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', marginTop: 2 }}>
                    {p.cuisine_type} · {p.price_range}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)' }}>{t?.weighted_score ?? 0}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>
                    {t?.vote_count ?? 0} {t?.vote_count === 1 ? 'vote' : 'votes'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => setEditing(true)}
          style={{ padding: '11px 0', borderRadius: 'var(--rs)', background: 'var(--bg)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', cursor: 'pointer' }}
        >
          Re-rank my picks
        </button>
      </div>
    );
  }

  // Voting form
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {proposals.map((p, i) => {
        const myRank = rankings[p.id];
        const accent = ACCENT[i % ACCENT.length] ?? 'var(--muted)';
        return (
          <div
            key={p.id}
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--r)',
              border: `1px solid ${myRank ? accent : 'var(--border2)'}`,
              boxShadow: myRank ? `0 0 0 1px ${accent}, var(--sh)` : 'var(--sh)',
              overflow: 'hidden',
              transition: 'border-color .2s, box-shadow .2s',
              animation: `fu .4s var(--sp) ${i * 50}ms both`,
            }}
          >
            <div style={{ height: 3, background: accent }} />
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--fb)', letterSpacing: '-.01em' }}>{p.restaurant_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>{p.cuisine_type} · {p.price_range}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '3px 0 0' }}>{p.restaurant_addr}</p>
                </div>
                {p.rating && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)', flexShrink: 0 }}>★ {p.rating}</span>
                )}
              </div>

              <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.6, fontStyle: 'italic', margin: '0 0 14px', padding: '8px 10px', background: 'var(--bg)', borderRadius: 'var(--rs)', borderLeft: `2px solid ${accent}` }}>
                {p.reasoning}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ranks.map((rank) => {
                  const selected = myRank === rank;
                  const takenBy = !selected && Object.entries(rankings).find(([pid, r]) => r === rank && pid !== p.id);
                  return (
                    <button
                      key={rank}
                      type="button"
                      className="vote-rank-btn"
                      data-testid={`vote-rank-${rank}`}
                      onClick={() => assignRank(p.id, rank)}
                      style={{
                        flex: '1 0 36px',
                        minWidth: 36,
                        borderRadius: 'var(--rs)',
                        border: `1px solid ${selected ? accent : 'var(--border2)'}`,
                        background: selected ? accent : 'var(--bg)',
                        color: selected ? '#fff' : takenBy ? 'var(--border)' : 'var(--muted)',
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'var(--fb)',
                        cursor: 'pointer',
                        transition: 'all .15s',
                        opacity: takenBy ? 0.5 : 1,
                      }}
                    >
                      #{rank}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {error && (
        <p data-testid="vote-error" style={{ fontSize: 12, color: 'oklch(50% 0.18 26)', fontFamily: 'var(--fb)', margin: 0 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {hasPriorVotes && (
          <button
            type="button"
            onClick={() => { setRankings(initialRankings!); setEditing(false); }}
            style={{ padding: '13px 18px', borderRadius: 'var(--rs)', border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', cursor: 'pointer' }}
          >
            Cancel
          </button>
        )}
        <button
          data-testid="vote-submit"
          onClick={submitVotes}
          disabled={!allRanked || loading}
          style={{
            flex: 1,
            padding: '13px 0', borderRadius: 'var(--rs)', border: 'none',
            background: allRanked ? 'var(--text)' : 'var(--border2)',
            color: allRanked ? 'var(--bg)' : 'var(--muted)',
            fontSize: 14, fontWeight: 600, fontFamily: 'var(--fb)',
            cursor: allRanked && !loading ? 'pointer' : 'not-allowed', opacity: loading ? 0.6 : 1,
            transition: 'background .2s, color .2s', letterSpacing: '-.01em',
          }}
        >
          {loading ? 'Submitting…' : allRanked ? (hasPriorVotes ? 'Update votes' : 'Submit votes') : `Rank all ${N} to continue`}
        </button>
      </div>

    </div>
  );
}
