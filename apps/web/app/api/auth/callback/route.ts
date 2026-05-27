import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/lib/funnel';

// Supabase redirects here after the user clicks the magic link
export async function GET(request: Request) {
  const url  = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const redirectTo = url.searchParams.get('redirectTo');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'link-expired');

      const inviteMatch = redirectTo?.match(/^\/invite\/([^/]+)\/confirmed$/);
      const inviteSlug = inviteMatch?.[1];
      if (inviteSlug) {
        loginUrl.searchParams.set('from', 'invite');
        loginUrl.searchParams.set('slug', inviteSlug);
      }

      return NextResponse.redirect(loginUrl);
    }
    const { data: { user } } = await supabase.auth.getUser();
    void track('auth_verified', { userId: user?.id });
  } else if (tokenHash && type === 'magiclink') {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });
    if (error) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'link-expired');

      const inviteMatch = redirectTo?.match(/^\/invite\/([^/]+)\/confirmed$/);
      const inviteSlug = inviteMatch?.[1];
      if (inviteSlug) {
        loginUrl.searchParams.set('from', 'invite');
        loginUrl.searchParams.set('slug', inviteSlug);
      }

      return NextResponse.redirect(loginUrl);
    }
    const { data: { user } } = await supabase.auth.getUser();
    void track('auth_verified', { userId: user?.id });
  } else if (tokenHash) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'link-expired');

    const inviteMatch = redirectTo?.match(/^\/invite\/([^/]+)\/confirmed$/);
    const inviteSlug = inviteMatch?.[1];
    if (inviteSlug) {
      loginUrl.searchParams.set('from', 'invite');
      loginUrl.searchParams.set('slug', inviteSlug);
    }

    return NextResponse.redirect(loginUrl);
  }

  const destination = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
    ? redirectTo
    : '/dashboard';

  return NextResponse.redirect(new URL(destination, request.url));
}
