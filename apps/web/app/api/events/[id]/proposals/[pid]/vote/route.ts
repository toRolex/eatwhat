import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { CastVoteSchema } from '@groupplan/types';
import { upsertVote } from '@groupplan/db';

interface Context {
  params: Promise<{ id: string; pid: string }>;
}

// Guest votes are submitted via invite token in the Authorization header
// because guests may not have a Supabase auth session
export async function POST(request: Request, { params }: Context) {
  const { id: eventId, pid } = await params;
  const token = request.headers.get('x-invite-token');
  if (!token) return NextResponse.json({ error: 'Missing invite token' }, { status: 401 });

  const db = createServiceClient();

  // Token must belong to *this* event — otherwise a guest of event A could
  // vote on event B's proposals by swapping the URL.
  const { data: invitation } = await db
    .from('invitations')
    .select('id, status, event_id')
    .eq('invite_token', token)
    .single();

  if (!invitation || invitation.status !== 'accepted') {
    return NextResponse.json({ error: 'Invalid token or not accepted' }, { status: 403 });
  }
  if (invitation.event_id !== eventId) {
    return NextResponse.json({ error: 'Token does not belong to this event' }, { status: 403 });
  }

  // Voting only opens once the host has triggered AI and proposals are live.
  const { data: event } = await db
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single();
  if (!event || event.status !== 'deciding') {
    return NextResponse.json({ error: 'Voting is not open for this event' }, { status: 409 });
  }

  // Proposal must actually belong to this event.
  const { data: proposal } = await db
    .from('proposals')
    .select('id')
    .eq('id', pid)
    .eq('event_id', eventId)
    .single();
  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found for this event' }, { status: 404 });
  }

  const body = await request.json();
  const parsed = CastVoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: vote, error } = await upsertVote(
    db as never,
    pid,
    invitation.id,
    parsed.data.rank,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ vote });
}
