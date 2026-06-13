import { NextResponse } from 'next/server';
import { CastVoteSchema } from '@groupplan/types';
import { upsertVote, getInvitationByToken, getInvitationBySlug, getEventById, getProposalsByEvent } from '@/lib/db';

interface Context {
  params: Promise<{ id: string; pid: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { id: eventId, pid } = await params;
  const invite = request.headers.get('x-invite-token');
  if (!invite) return NextResponse.json({ error: 'Missing invite token' }, { status: 401 });

  const { data: invitation } = invite.length === 64
    ? getInvitationByToken(invite)
    : getInvitationBySlug(invite);

  if (!invitation || (invitation as Record<string, unknown>).status !== 'accepted') {
    return NextResponse.json({ error: 'Invalid token or not accepted' }, { status: 403 });
  }
  if ((invitation as Record<string, unknown>).event_id !== eventId) {
    return NextResponse.json({ error: 'Token does not belong to this event' }, { status: 403 });
  }

  const eventRes = getEventById(eventId);
  if (!eventRes.data || (eventRes.data as Record<string, unknown>).status !== 'deciding') {
    return NextResponse.json({ error: 'Voting is not open for this event' }, { status: 409 });
  }

  const { data: proposals } = getProposalsByEvent(eventId);
  const proposal = (proposals as Array<{ id: string }> | undefined)?.find((p) => p.id === pid);
  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found for this event' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = CastVoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: vote, error } = upsertVote(pid, (invitation as Record<string, unknown>).id as string, parsed.data.rank);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ vote });
}
