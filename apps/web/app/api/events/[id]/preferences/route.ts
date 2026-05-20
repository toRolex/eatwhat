import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEventById, getPreferencesByEvent, getInvitationsByEvent } from '@groupplan/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: event } = await getEventById(supabase, id);
  if (!event || event.host_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [{ data: preferences }, { data: invitations }] = await Promise.all([
    getPreferencesByEvent(supabase, id),
    getInvitationsByEvent(supabase, id),
  ]);

  const accepted = invitations?.filter((i) => i.status === 'accepted').length ?? 0;

  return NextResponse.json({
    preferences: preferences ?? [],
    total_invited:   invitations?.length ?? 0,
    total_responded: accepted,
  });
}
