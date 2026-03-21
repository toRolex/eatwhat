import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { RSVPSchema } from '@groupplan/types';
import { getInvitationByToken, updateInvitationStatus, getEventById } from '@groupplan/db';

interface Context {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: invitation } = await getInvitationByToken(db as never, token);
  if (!invitation) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  const { data: event } = await getEventById(db as never, invitation.event_id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (new Date(event.rsvp_deadline) < new Date()) {
    return NextResponse.json({ error: 'RSVP deadline has passed' }, { status: 422 });
  }

  const body = await request.json();
  const parsed = RSVPSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: updated, error } = await updateInvitationStatus(
    db as never,
    token,
    parsed.data.status,
    parsed.data.name,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invitation: updated });
}
