'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Proposal } from '@groupplan/types';

interface Props {
  proposals: Proposal[];
  invitationId: string;
  token: string;
}

export default function VotingInterface({ proposals, invitationId: _, token }: Props) {
  const router = useRouter();
  // Map proposal id → assigned rank (1, 2, or 3)
  const [rankings, setRankings] = useState<Record<string, 1 | 2 | 3>>({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  function assignRank(proposalId: string, rank: 1 | 2 | 3) {
    // Remove any other proposal with this rank first
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
          headers: {
            'Content-Type':   'application/json',
            'x-invite-token': token,
          },
          body: JSON.stringify({ rank }),
        }),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      setLoading(false);
      setError('Some votes failed to submit. Please try again.');
      return;
    }

    router.push(`/invite/${token}`);
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-4">
        {proposals.map((p) => (
          <li key={p.id} className="p-4 rounded-xl border border-zinc-200 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900">{p.restaurant_name}</p>
                <p className="text-sm text-zinc-500">{p.cuisine_type} · {p.price_range}</p>
                <p className="text-sm text-zinc-400 mt-1">{p.restaurant_addr}</p>
              </div>
              {p.rating && (
                <span className="text-sm font-medium text-zinc-700 flex-shrink-0">★ {p.rating}</span>
              )}
            </div>
            <p className="text-sm text-zinc-600 italic">{p.reasoning}</p>

            <div className="flex gap-2">
              {([1, 2, 3] as const).map((rank) => (
                <button
                  key={rank}
                  type="button"
                  onClick={() => assignRank(p.id, rank)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    rankings[p.id] === rank
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
                  }`}
                >
                  #{rank}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submitVotes}
        disabled={!allRanked || loading}
        className="w-full py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
      >
        {loading ? 'Submitting…' : allRanked ? 'Submit votes' : 'Rank all 3 to continue'}
      </button>
    </div>
  );
}
