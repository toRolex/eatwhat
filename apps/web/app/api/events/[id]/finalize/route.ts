import { NextResponse } from 'next/server';
import { FinalizeSchema } from '@groupplan/types';
import { getEventById, getInvitationsByEvent, getDb } from '@/lib/db';
import { DINNER_DURATION_MS } from '@/lib/scoring';

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;

  const { data: event } = getEventById(id);
  if (!event || (event as Record<string, unknown>).host_id !== 'demo-host') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if ((event as Record<string, unknown>).status !== 'deciding') {
    return NextResponse.json({ error: 'Event is not in deciding state' }, { status: 422 });
  }

  const body = await request.json();
  const parsed = FinalizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ? AND event_id = ?').get(parsed.data.proposal_id, id) as Record<string, unknown> | undefined;

  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  const { data: invitations } = getInvitationsByEvent(id);
  const attendees = ((invitations ?? []) as Array<{ status: string; name: string; email: string }>)
    .filter((i) => i.status === 'accepted')
    .map((i) => ({ name: i.name, email: i.email }));

  const confirmedTime = new Date(parsed.data.confirmed_time);
  const endTime = new Date(confirmedTime.getTime() + DINNER_DURATION_MS);

  const calendarData = {
    title: (event as Record<string, unknown>).title as string,
    description: `GroupPlan dinner at ${proposal.restaurant_name}`,
    location: proposal.restaurant_addr,
    start_time: confirmedTime.toISOString(),
    end_time: endTime.toISOString(),
    attendees,
  };

  const planId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO finalized_plans (id, event_id, proposal_id, confirmed_time, notes, calendar_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(planId, id, parsed.data.proposal_id, parsed.data.confirmed_time, parsed.data.notes ?? null, JSON.stringify(calendarData));

  db.prepare("UPDATE events SET status = 'finalized' WHERE id = ?").run(id);

  const plan = db.prepare('SELECT * FROM finalized_plans WHERE id = ?').get(planId) as Record<string, unknown>;

  // Notifications disabled (no Supabase/SendGrid)
  return NextResponse.json({ plan, emails: null });
}
