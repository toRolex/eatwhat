import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getPreferencesSchema } from '@groupplan/types';
import { getInvitationBySlug, getInvitationByToken, upsertPreferences, getEventById } from '@groupplan/db';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: Context) {
  const { slug } = await params;
  const db = createServiceClient();

  const { data: invitation } = slug.length === 64
    ? await getInvitationByToken(db, slug)
    : await getInvitationBySlug(db, slug);
  if (!invitation) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });

  if (invitation.status !== 'accepted') {
    return NextResponse.json(
      { error: 'Only accepted guests can submit preferences' },
      { status: 403 },
    );
  }

  const { data: event } = await getEventById(db, invitation.event_id);
  const schema = getPreferencesSchema((event as { category?: string } | null)?.category ?? 'dinner');

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: preferences, error } = await upsertPreferences(
    db,
    invitation.id,
    invitation.event_id,
    parsed.data,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preferences });
}
