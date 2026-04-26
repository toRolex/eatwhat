import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InviteGuestsSchema } from '@groupplan/types';
import { getEventById, createInvitations } from '@groupplan/db';
import { getNotificationService, sendBatch, appUrl } from '@/lib/notifications';

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

  // Advance the event into 'collecting' on first invite so guests can submit prefs
  if (event.status === 'open') {
    await supabase.from('events').update({ status: 'collecting' }).eq('id', id);
  }

  // Fetch host display name for the invitation copy
  const { data: hostRow } = await supabase
    .from('users').select('name').eq('id', user.id).single();
  const hostName = hostRow?.name ?? user.email?.split('@')[0] ?? 'Your friend';

  const notifier = getNotificationService();
  let emailSummary: { sent: number; failed: number } | null = null;

  if (notifier && invitations) {
    const batch = await sendBatch(
      notifier,
      invitations.map((inv) => ({
        to:       { name: inv.name, email: inv.email },
        template: 'invitation-sent' as const,
        data: {
          host_name:   hostName,
          event_title: event.title,
          invite_url:  `${appUrl()}/invite/${inv.invite_token}`,
        },
      })),
      `invite event ${id}`,
    );
    emailSummary = { sent: batch.sent, failed: batch.failed };
  }

  return NextResponse.json({
    invitations,
    emails: emailSummary,
    email_disabled: !notifier,
  }, { status: 201 });
}
