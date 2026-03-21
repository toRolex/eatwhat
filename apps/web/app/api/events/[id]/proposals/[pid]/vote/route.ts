import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { CastVoteSchema } from '@groupplan/types';
import { upsertVote } from '@groupplan/db';

interface Context {
  params: Promise<{ id: string; pid: string }>;
}

// Guest votes are submitted via invite token in the Authorization header
// because guests may not have a Supabase auth session
export async function POST(request: Request, { params }: Context) {
  const { pid } = await params;
  const token = request.headers.get('x-invite-token');
  if (!token) return NextResponse.json({ error: 'Missing invite token' }, { status: 401 });

  const db = createServiceClient();

  const { data: invitation } = await db
    .from('invitations')
    .select('id, status')
    .eq('invite_token', token)
    .single();

  if (!invitation || invitation.status !== 'accepted') {
    return NextResponse.json({ error: 'Invalid token or not accepted' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = CastVoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: vote, error } = await upsertVote(
    db as never,
    pid,
    invitation.id,
    parsed.data.rank,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ vote });
}
