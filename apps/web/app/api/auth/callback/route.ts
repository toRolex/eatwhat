import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/lib/funnel';

// Supabase redirects here after the user clicks the magic link
export async function GET(request: Request) {
  const url  = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const { data: { user } } = await supabase.auth.getUser();
    void track('auth_verified', { userId: user?.id });
  }

  const redirectTo = url.searchParams.get('redirectTo');
  const destination = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
    ? redirectTo
    : '/dashboard';

  return NextResponse.redirect(new URL(destination, request.url));
}
