import { NextResponse } from 'next/server';
import { getEventById, getPreferencesByEvent, getInvitationsByEvent } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const hostId = 'demo-host'; // Supabase auth removed

  const { data: event } = getEventById(id);
  if (!event || (event as Record<string, unknown>).host_id !== hostId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [{ data: preferences }, { data: invitations }] = await Promise.all([
    Promise.resolve(getPreferencesByEvent(id)),
    Promise.resolve(getInvitationsByEvent(id)),
  ]);

  const accepted = (invitations as Array<{ status: string }> | undefined)?.filter((i) => i.status === 'accepted').length ?? 0;

  return NextResponse.json({
    preferences: preferences ?? [],
    total_invited: (invitations as unknown[])?.length ?? 0,
    total_responded: accepted,
  });
}
