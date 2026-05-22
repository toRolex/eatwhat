import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getInvitationBySlug, getInvitationByToken, getEventById } from '@groupplan/db';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { slug } = await params;
  const db = createServiceClient();

  const { data: invitation } = slug.length === 64
    ? await getInvitationByToken(db, slug)
    : await getInvitationBySlug(db, slug);
  if (!invitation) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });

  const { data: event } = await getEventById(db, invitation.event_id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const { data: host } = await db
    .from('users')
    .select('name, avatar_url')
    .eq('id', event.host_id)
    .single();

  return NextResponse.json({ invitation, event, host });
}
