import { NextResponse } from 'next/server';
import { TriggerEventSchema } from '@groupplan/types';
import { getEventById, getPreferencesByEvent, replaceProposalsAndAdvance, getInvitationsByEvent, logUsage, getMonthlySpendByEvent, getSpendSince } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

// TODO: Stub — full AI pipeline disabled in SQLite mode.
// Re-enable when @groupplan/ai and @groupplan/venues are ported.

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;

  const { data: event } = getEventById(id);
  if (!event || (event as Record<string, unknown>).host_id !== 'demo-host') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const evt = event as Record<string, unknown>;
  if (evt.status !== 'collecting' && evt.status !== 'deciding') {
    return NextResponse.json(
      { error: 'AI synthesis can only run while status is collecting or deciding' },
      { status: 422 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = TriggerEventSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message = flat.formErrors[0] ?? Object.values(flat.fieldErrors).flat()[0] ?? 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (evt.status === 'deciding' && !parsed.data.confirm_rerun) {
    return NextResponse.json(
      { error: 'Re-running will discard existing proposals and votes. Resend with confirm_rerun=true.', code: 'rerun_confirmation_required' },
      { status: 409 },
    );
  }

  // AI pipeline not available in SQLite mode — return stub response
  return NextResponse.json({
    ok: false,
    error: 'AI pipeline not yet ported to SQLite. This route is a stub.',
    hint: 'The trigger endpoint depends on @groupplan/ai and @groupplan/venues external APIs.',
  });
}
