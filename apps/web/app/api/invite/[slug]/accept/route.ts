import { NextRequest, NextResponse } from 'next/server';
import { getEventById, getInvitationBySlug, getInvitationByToken, getDb } from '@/lib/db';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: NextRequest, { params }: Context) {
  const { slug } = await params;

  const { data: invitation } = slug.length === 64
    ? getInvitationByToken(slug)
    : getInvitationBySlug(slug);
  if (!invitation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const inv = invitation as Record<string, unknown>;
  const inviteSlug = inv.slug as string;
  if (inv.status === 'declined') return NextResponse.json({ error: 'Already declined' }, { status: 400 });
  if (inv.status === 'accepted') return NextResponse.json({ redirect: `/invite/${inviteSlug}/confirmed` });

  const { data: event } = getEventById(inv.event_id as string);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (new Date((event as Record<string, unknown>).rsvp_deadline as string) < new Date()) {
    return NextResponse.json({ error: 'RSVP deadline has passed' }, { status: 422 });
  }
  if (!['open', 'collecting'].includes((event as Record<string, unknown>).status as string)) {
    return NextResponse.json({ error: 'RSVPs are no longer being accepted for this event' }, { status: 422 });
  }

  const db = getDb();
  db.prepare("UPDATE invitations SET status = 'accepted', responded_at = ? WHERE id = ?")
    .run(new Date().toISOString(), inv.id);

  return NextResponse.json({ redirect: `/invite/${inviteSlug}/confirmed` });
}
