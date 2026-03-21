import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FinalizeSchema } from '@groupplan/types';
import { getEventById, getInvitationsByEvent } from '@groupplan/db';

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
  if (event.status !== 'deciding') {
    return NextResponse.json({ error: 'Event is not in deciding state' }, { status: 422 });
  }

  const body = await request.json();
  const parsed = FinalizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', parsed.data.proposal_id)
    .eq('event_id', id)
    .single();

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  const { data: invitations } = await getInvitationsByEvent(supabase as never, id);
  const attendees = (invitations ?? [])
    .filter((i) => i.status === 'accepted')
    .map((i) => ({ name: i.name, email: i.email }));

  const confirmedTime = new Date(parsed.data.confirmed_time);
  const endTime = new Date(confirmedTime.getTime() + 90 * 60 * 1000); // default 90-min dinner

  const calendarData = {
    title:       event.title,
    description: `GroupPlan dinner at ${proposal.restaurant_name}`,
    location:    proposal.restaurant_addr,
    start_time:  confirmedTime.toISOString(),
    end_time:    endTime.toISOString(),
    attendees,
  };

  const { data: plan, error } = await supabase
    .from('finalized_plans')
    .insert({
      event_id:       id,
      proposal_id:    parsed.data.proposal_id,
      confirmed_time: parsed.data.confirmed_time,
      notes:          parsed.data.notes,
      calendar_data:  calendarData,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('events').update({ status: 'finalized' }).eq('id', id);

  // TODO: notify all accepted guests that the winner has been announced

  return NextResponse.json({ plan });
}
