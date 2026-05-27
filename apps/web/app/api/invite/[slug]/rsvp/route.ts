import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { RSVPSchema } from '@groupplan/types';
import { getInvitationBySlug, getInvitationByToken, getEventById } from '@groupplan/db';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { slug } = await params;
  const db = createServiceClient();

  const { data: invitation } = slug.length === 64
    ? await getInvitationByToken(db, slug)
    : await getInvitationBySlug(db, slug);
  if (!invitation) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });

  const { data: event } = await getEventById(db, invitation.event_id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (new Date(event.rsvp_deadline) < new Date()) {
    return NextResponse.json({ error: 'RSVP deadline has passed' }, { status: 422 });
  }
  if (!['open', 'collecting'].includes(event.status)) {
    return NextResponse.json({ error: 'RSVPs are no longer being accepted for this event' }, { status: 422 });
  }

  const body = await request.json();
  const parsed = RSVPSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message = flat.formErrors[0] ?? Object.values(flat.fieldErrors).flat()[0] ?? 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const payload = {
    status: parsed.data.status,
    responded_at: new Date().toISOString(),
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
  };

  const { data: updated, error } = await db
    .from('invitations')
    .update(payload)
    .eq('id', invitation.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invitation: updated });
}
