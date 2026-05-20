import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateEventSchema, EVENT_STATUS_TRANSITIONS, type EventStatus } from '@groupplan/types';
import { getEventById, updateEvent, updateEventStatus, deleteEvent } from '@groupplan/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event, error } = await getEventById(supabase as never, id);

  if (error || !event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ event });
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // Status transitions are handled separately from field updates
  if ('status' in body) {
    const { data: event } = await getEventById(supabase as never, id);
    if (!event || event.host_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const allowed = EVENT_STATUS_TRANSITIONS[event.status as EventStatus];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${event.status} to ${body.status}` },
        { status: 422 },
      );
    }

    const { data: updated, error } = await updateEventStatus(supabase as never, id, body.status);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: updated });
  }

  const parsed = UpdateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await getEventById(supabase as never, id);
  if (!existing || existing.host_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: updated, error } = await updateEvent(supabase as never, id, parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ event: updated });
}

export async function DELETE(_req: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: event } = await getEventById(supabase as never, id);
  if (!event || event.host_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await deleteEvent(supabase as never, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
