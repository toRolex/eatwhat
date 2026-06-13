import { NextResponse } from 'next/server';
import { RSVPSchema } from '@groupplan/types';
import { getInvitationBySlug, getInvitationByToken, getEventById, getDb } from '@/lib/db';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { slug } = await params;

  const { data: invitation } = slug.length === 64
    ? getInvitationByToken(slug)
    : getInvitationBySlug(slug);
  if (!invitation) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });

  const inv = invitation as Record<string, unknown>;

  const { data: event } = getEventById(inv.event_id as string);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const evt = event as Record<string, unknown>;

  if (new Date(evt.rsvp_deadline as string) < new Date()) {
    return NextResponse.json({ error: 'RSVP deadline has passed' }, { status: 422 });
  }
  if (!['open', 'collecting'].includes(evt.status as string)) {
    return NextResponse.json({ error: 'RSVPs are no longer being accepted for this event' }, { status: 422 });
  }

  const body = await request.json();
  const parsed = RSVPSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message = flat.formErrors[0] ?? Object.values(flat.fieldErrors).flat()[0] ?? 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const db = getDb();
  const respondedAt = new Date().toISOString();
  if (parsed.data.name !== undefined) {
    db.prepare('UPDATE invitations SET status = ?, responded_at = ?, name = ? WHERE id = ?')
      .run(parsed.data.status, respondedAt, parsed.data.name, inv.id);
  } else {
    db.prepare('UPDATE invitations SET status = ?, responded_at = ? WHERE id = ?')
      .run(parsed.data.status, respondedAt, inv.id);
  }

  const updated = db.prepare('SELECT * FROM invitations WHERE id = ?').get(inv.id) as Record<string, unknown>;

  return NextResponse.json({ invitation: updated });
}
