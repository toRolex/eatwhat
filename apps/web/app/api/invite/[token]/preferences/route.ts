import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { SubmitPreferencesSchema } from '@groupplan/types';
import { getInvitationByToken, upsertPreferences } from '@groupplan/db';

interface Context {
  params: Promise<{ token: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: invitation } = await getInvitationByToken(db as never, token);
  if (!invitation) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  if (invitation.status !== 'accepted') {
    return NextResponse.json(
      { error: 'Only accepted guests can submit preferences' },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = SubmitPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: preferences, error } = await upsertPreferences(
    db as never,
    invitation.id,
    invitation.event_id,
    parsed.data,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preferences });
}
