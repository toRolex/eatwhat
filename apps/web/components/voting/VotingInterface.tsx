'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Proposal } from '@groupplan/types';

interface Props {
  proposals: Proposal[];
  invitationId: string;
  token: string;
}

const ACCENT = ['var(--amber)', 'var(--sage)', 'var(--sky)'];

export default function VotingInterface({ proposals, invitationId: _, token }: Props) {
  const router = useRouter();
  const [rankings, setRankings] = useState<Record<string, 1 | 2 | 3>>({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  function assignRank(proposalId: string, rank: 1 | 2 | 3) {
    setRankings((prev) => {
      const next = { ...prev };
      for (const [pid, r] of Object.entries(next)) {
        if (r === rank && pid !== proposalId) delete next[pid];
      }
      next[proposalId] = rank;
      return next;
    });
  }

  const allRanked = proposals.every((p) => p.id in rankings);

  async function submitVotes() {
    if (!allRanked) return;
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled(
      Object.entries(rankings).map(([pid, rank]) =>
        fetch(`/api/events/${proposals[0]!.event_id}/proposals/${pid}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-invite-token': token },
          body: JSON.stringify({ rank }),
        }),
      ),
    );

    if (results.some((r) => r.status === 'rejected')) {
      setLoading(false);
      setError('Some votes failed — please try again.');
      return;
    }

    router.push(`/invite/${token}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Proposal cards */}
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
              animation: `fu .4s var(--sp) ${i * 60}ms both`,
            }}
          >
            <div style={{ height: 3, background: accent }} />
            <div style={{ padding: '16px 18px' }}>
              {/* Header */}
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

              {/* Reasoning */}
              <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.6, fontStyle: 'italic', margin: '0 0 14px', padding: '8px 10px', background: 'var(--bg)', borderRadius: 'var(--rs)', borderLeft: `2px solid ${accent}` }}>
                {p.reasoning}
              </p>

              {/* Rank buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {([1, 2, 3] as const).map((rank) => {
                  const selected = myRank === rank;
                  const takenBy = !selected && Object.entries(rankings).find(([pid, r]) => r === rank && pid !== p.id);
                  return (
                    <button
                      key={rank}
                      type="button"
                      onClick={() => assignRank(p.id, rank)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
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
        <p style={{ fontSize: 12, color: 'oklch(50% 0.18 26)', fontFamily: 'var(--fb)', margin: 0 }}>{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={submitVotes}
        disabled={!allRanked || loading}
        style={{
          width: '100%',
          padding: '13px 0',
          borderRadius: 'var(--rs)',
          border: 'none',
          background: allRanked ? 'var(--text)' : 'var(--border2)',
          color: allRanked ? 'var(--bg)' : 'var(--muted)',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'var(--fb)',
          cursor: allRanked && !loading ? 'pointer' : 'not-allowed',
          opacity: loading ? 0.6 : 1,
          transition: 'background .2s, color .2s',
          letterSpacing: '-.01em',
        }}
      >
        {loading ? 'Submitting…' : allRanked ? 'Submit votes' : 'Rank all 3 to continue'}
      </button>
    </div>
  );
}
