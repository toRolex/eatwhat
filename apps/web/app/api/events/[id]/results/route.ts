import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProposalsByEvent, getVotesByEvent } from '@groupplan/db';
import { maybeAutoFinalize } from '@/lib/auto-finalize';
import { computeBorda } from '@/lib/scoring';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Lock in the winner if vote_deadline has passed and nobody's done it yet.
  await maybeAutoFinalize(id).catch(() => {});

  const [{ data: proposals }, { data: votes }] = await Promise.all([
    getProposalsByEvent(supabase, id),
    getVotesByEvent(supabase, id),
  ]);

  if (!proposals?.length) {
    return NextResponse.json({ proposals: [], winner: null, total_voters: 0 });
  }

  const { tally, totalVoters } = computeBorda(
    proposals.map((p) => p.id),
    votes ?? [],
  );
  const byId = new Map(tally.map((t) => [t.proposal_id, t]));

  const ranked = proposals.map((p) => ({
    ...p,
    vote_count:     byId.get(p.id)?.vote_count     ?? 0,
    weighted_score: byId.get(p.id)?.weighted_score ?? 0,
  })).sort((a, b) => b.weighted_score - a.weighted_score);

  const winner = ranked[0]?.weighted_score ? ranked[0] : null;

  return NextResponse.json({ proposals: ranked, winner, total_voters: totalVoters });
}
