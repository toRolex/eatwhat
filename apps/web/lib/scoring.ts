// Default dinner duration used when building calendar_data for finalized events.
export const DINNER_DURATION_MS = 90 * 60 * 1000;

// Borda count: with N proposals, a rank-1 vote is worth N points, rank-N is 1.
// A vote cast beyond N (shouldn't happen with validation, but be safe) scores 0.
export function bordaScore(rank: number, totalProposals: number): number {
  return Math.max(0, totalProposals + 1 - rank);
}

export interface BordaTally {
  proposal_id:    string;
  vote_count:     number;
  weighted_score: number;
}

// Aggregate a flat list of vote rows into per-proposal Borda tallies.
export function computeBorda(
  proposalIds: string[],
  votes: Array<{ proposal_id: string; invitation_id: string; rank: number }>,
): { tally: BordaTally[]; totalVoters: number } {
  const N = proposalIds.length;
  const byId = new Map<string, BordaTally>(
    proposalIds.map((id) => [id, { proposal_id: id, vote_count: 0, weighted_score: 0 }]),
  );
  const voters = new Set<string>();

  for (const v of votes) {
    voters.add(v.invitation_id);
    const entry = byId.get(v.proposal_id);
    if (entry) {
      entry.vote_count    += 1;
      entry.weighted_score += bordaScore(v.rank, N);
    }
  }

  return { tally: [...byId.values()], totalVoters: voters.size };
}
