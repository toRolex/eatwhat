import { NextResponse } from 'next/server';
import { getInvitationBySlug, getInvitationByToken, getProposalsByEvent, getVotesByEvent } from '@/lib/db';
import { maybeAutoFinalize } from '@/lib/auto-finalize';
import { computeBorda } from '@/lib/scoring';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { slug } = await params;

  const { data: invitation } = slug.length === 64
    ? getInvitationByToken(slug)
    : getInvitationBySlug(slug);
  if (!invitation) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });

  const inv = invitation as Record<string, unknown>;
  await maybeAutoFinalize(inv.event_id as string).catch(() => {});

  const [{ data: proposals }, { data: votes }] = await Promise.all([
    Promise.resolve(getProposalsByEvent(inv.event_id as string)),
    Promise.resolve(getVotesByEvent(inv.event_id as string)),
  ]);

  const { tally, totalVoters } = computeBorda(
    ((proposals ?? []) as Array<{ id: string }>).map((p) => p.id),
    (votes ?? []) as Array<{ proposal_id: string; invitation_id: string; rank: number }>,
  );

  return NextResponse.json({ tally, total_voters: totalVoters });
}
