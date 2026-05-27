import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getInvitationBySlug, getInvitationByToken, getProposalsByEvent, getVotesByEvent } from '@groupplan/db';
import { maybeAutoFinalize } from '@/lib/auto-finalize';
import { computeBorda } from '@/lib/scoring';

interface Context {
  params: Promise<{ slug: string }>;
}

// Public live tally for voters — accessed by invite slug or legacy token, not the host session.
// Returns per-proposal weighted Borda score so the voting UI can render bars.
export async function GET(_req: Request, { params }: Context) {
  const { slug } = await params;
  const db = createServiceClient();

  const { data: invitation } = slug.length === 64
    ? await getInvitationByToken(db, slug)
    : await getInvitationBySlug(db, slug);
  if (!invitation) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });

  await maybeAutoFinalize(invitation.event_id).catch(() => {});

  const [{ data: proposals }, { data: votes }] = await Promise.all([
    getProposalsByEvent(db, invitation.event_id),
    getVotesByEvent(db, invitation.event_id),
  ]);

  const { tally, totalVoters } = computeBorda(
    (proposals ?? []).map((p) => p.id),
    votes ?? [],
  );

  return NextResponse.json({ tally, total_voters: totalVoters });
}
