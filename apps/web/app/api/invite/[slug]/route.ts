import { NextResponse } from 'next/server';
import { getInvitationBySlug, getInvitationByToken, getEventById, getDb } from '@/lib/db';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { slug } = await params;

  const { data: invitation } = slug.length === 64
    ? getInvitationByToken(slug)
    : getInvitationBySlug(slug);
  if (!invitation) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });

  const { data: event } = getEventById((invitation as Record<string, unknown>).event_id as string);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Host info: in SQLite mode, just return a stub
  const host = { name: 'Host', avatar_url: null };

  return NextResponse.json({ invitation, event, host });
}
