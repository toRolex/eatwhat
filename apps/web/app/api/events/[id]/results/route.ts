import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProposalsByEvent, getVotesByEvent } from '@groupplan/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: proposals }, { data: votes }] = await Promise.all([
    getProposalsByEvent(supabase as never, id),
    getVotesByEvent(supabase as never, id),
  ]);

  if (!proposals?.length) {
    return NextResponse.json({ proposals: [], winner: null, total_voters: 0 });
  }

  // Borda count: rank-1 vote = 3pts, rank-2 = 2pts, rank-3 = 1pt
  const scores: Record<string, { count: number; score: number }> = {};
  const voters = new Set<string>();

  for (const vote of votes ?? []) {
    voters.add(vote.invitation_id);
    if (!scores[vote.proposal_id]) scores[vote.proposal_id] = { count: 0, score: 0 };
    scores[vote.proposal_id]!.count += 1;
    scores[vote.proposal_id]!.score += 4 - vote.rank;
  }

  const ranked = proposals.map((p) => ({
    ...p,
    vote_count:     scores[p.id]?.count ?? 0,
    weighted_score: scores[p.id]?.score ?? 0,
  })).sort((a, b) => b.weighted_score - a.weighted_score);

  const winner = ranked[0]?.weighted_score ? ranked[0] : null;

  return NextResponse.json({ proposals: ranked, winner, total_voters: voters.size });
}
