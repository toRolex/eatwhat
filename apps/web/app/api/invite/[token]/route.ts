import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getInvitationByToken, getEventById } from '@groupplan/db';

interface Context {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: invitation } = await getInvitationByToken(db as never, token);
  if (!invitation) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  const { data: event } = await getEventById(db as never, invitation.event_id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const { data: host } = await db
    .from('users')
    .select('name, avatar_url')
    .eq('id', event.host_id)
    .single();

  return NextResponse.json({ invitation, event, host });
}
