import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InviteGuestsSchema } from '@groupplan/types';
import { getEventById, createInvitations } from '@groupplan/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: event } = await getEventById(supabase as never, id);
  if (!event || event.host_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (event.status !== 'open' && event.status !== 'collecting') {
    return NextResponse.json(
      { error: 'Invitations can only be sent while the event is open or collecting' },
      { status: 422 },
    );
  }

  const body = await request.json();
  const parsed = InviteGuestsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rows = parsed.data.guests.map((g) => ({ event_id: id, name: g.name, email: g.email }));
  const { data: invitations, error } = await createInvitations(supabase as never, rows);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // TODO: dispatch notification job to send invitation emails via NotificationService

  return NextResponse.json({ invitations }, { status: 201 });
}
