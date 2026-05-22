import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { getInvitationBySlug, getInvitationByToken } from '@groupplan/db';
import { track } from '@/lib/funnel';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: NextRequest, { params }: Context) {
  const { slug } = await params;
  const serviceDb = createServiceClient();
  const authDb = await createClient();
  const { data: { user } } = await authDb.auth.getUser();
  const { data: invitation } = slug.length === 64
    ? await getInvitationByToken(serviceDb, slug)
    : await getInvitationBySlug(serviceDb, slug);
  if (!invitation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const inviteSlug = invitation.slug;
  if (invitation.status === 'declined') return NextResponse.json({ error: 'Already declined' }, { status: 400 });
  if (invitation.status === 'accepted') return NextResponse.json({ redirect: `/invite/${inviteSlug}/confirmed` });
  if (user) {
    await serviceDb.from('invitations').update({ status: 'accepted', user_id: user.id, responded_at: new Date().toISOString() }).eq('id', invitation.id);
    void track('invite_accepted', { userId: user.id, metadata: { slug: inviteSlug } });
    return NextResponse.json({ redirect: `/invite/${inviteSlug}/confirmed` });
  }
  await serviceDb.from('invitations').update({ status: 'pending_signup', responded_at: new Date().toISOString() }).eq('id', invitation.id);
  void track('invite_pending_signup', { metadata: { slug: inviteSlug } });
  const response = NextResponse.json({ redirect: `/login?from=invite&slug=${inviteSlug}` });
  response.cookies.set('gp_invite_slug', inviteSlug, { httpOnly: true, maxAge: 3600, path: '/', sameSite: 'lax' });
  return response;
}
