import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getInvitationByToken, getProposalsByEvent, getVotesByEvent } from '@groupplan/db';
import { maybeAutoFinalize } from '@/lib/auto-finalize';
import { computeBorda } from '@/lib/scoring';

interface Context {
  params: Promise<{ token: string }>;
}

// Public live tally for voters — accessed by invite token, not the host session.
// Returns per-proposal weighted Borda score so the voting UI can render bars.
export async function GET(_req: Request, { params }: Context) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: invitation } = await getInvitationByToken(db as never, token);
  if (!invitation) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  await maybeAutoFinalize(invitation.event_id).catch(() => {});

  const [{ data: proposals }, { data: votes }] = await Promise.all([
    getProposalsByEvent(db as never, invitation.event_id),
    getVotesByEvent(db as never, invitation.event_id),
  ]);

  const { tally, totalVoters } = computeBorda(
    (proposals ?? []).map((p) => p.id),
    votes ?? [],
  );

  return NextResponse.json({ tally, total_voters: totalVoters });
}
