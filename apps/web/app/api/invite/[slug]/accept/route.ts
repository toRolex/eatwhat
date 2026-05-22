import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { getEventById, getInvitationBySlug, getInvitationByToken } from '@groupplan/db';
import { track } from '@/lib/funnel';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: NextRequest, { params }: Context) {
  const { slug } = await params;
  const serviceDb = createServiceClient();
  const authDb = await createClient();
  const { data: { user } } = await authDb.auth.getUser();
  const { data: invitation } = slug.length === 64
    ? await getInvitationByToken(serviceDb, slug)
    : await getInvitationBySlug(serviceDb, slug);
  if (!invitation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const inviteSlug = invitation.slug;
  if (invitation.status === 'declined') return NextResponse.json({ error: 'Already declined' }, { status: 400 });
  if (invitation.status === 'accepted') return NextResponse.json({ redirect: `/invite/${inviteSlug}/confirmed` });
  const { data: event } = await getEventById(serviceDb, invitation.event_id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (new Date(event.rsvp_deadline) < new Date()) {
    return NextResponse.json({ error: 'RSVP deadline has passed' }, { status: 422 });
  }
  if (!['open', 'collecting'].includes(event.status)) {
    return NextResponse.json({ error: 'RSVPs are no longer being accepted for this event' }, { status: 422 });
  }
  const { error: updateError } = await serviceDb.from('invitations').update({
    status: 'accepted',
    responded_at: new Date().toISOString(),
    ...(user ? { user_id: user.id } : {}),
  }).eq('id', invitation.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  void track('invite_accepted', { userId: user?.id ?? null, metadata: { slug: inviteSlug } });
  return NextResponse.json({ redirect: `/invite/${inviteSlug}/confirmed` });
}
