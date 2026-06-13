import { NextResponse } from 'next/server';
import { getProposalsByEvent, getVotesByEvent } from '@/lib/db';
import { computeBorda } from '@/lib/scoring';
import { maybeAutoFinalize } from '@/lib/auto-finalize';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;

  // Lock in the winner if vote_deadline has passed
  await maybeAutoFinalize(id).catch(() => {});

  const [{ data: proposals }, { data: votes }] = await Promise.all([
    Promise.resolve(getProposalsByEvent(id)),
    Promise.resolve(getVotesByEvent(id)),
  ]);

  if (!(proposals as unknown[])?.length) {
    return NextResponse.json({ proposals: [], winner: null, total_voters: 0 });
  }

  const { tally, totalVoters } = computeBorda(
    (proposals as Array<{ id: string }>).map((p) => p.id),
    (votes ?? []) as Array<{ proposal_id: string; invitation_id: string; rank: number }>,
  );
  const byId = new Map(tally.map((t) => [t.proposal_id, t]));

  const ranked = (proposals as unknown[]).map((p) => ({
    ...(p as object),
    vote_count: byId.get((p as { id: string }).id)?.vote_count ?? 0,
    weighted_score: byId.get((p as { id: string }).id)?.weighted_score ?? 0,
  })).sort((a, b) => (b as { weighted_score: number }).weighted_score - (a as { weighted_score: number }).weighted_score);

  const winner = (ranked[0] as { weighted_score: number } | undefined)?.weighted_score ? ranked[0] : null;

  return NextResponse.json({ proposals: ranked, winner, total_voters: totalVoters });
}
