import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@groupplan/db';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  let sessionCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          sessionCookies = cookiesToSet;
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Calling getUser() here is what triggers the token refresh. It must be
  // called immediately after createServerClient with no intervening logic —
  // any await between them can cause hard-to-diagnose session inconsistencies.
  // When the access token is near expiry Supabase issues new tokens; setAll
  // above writes them back into supabaseResponse so the browser receives them.
  const { data: { user } } = await supabase.auth.getUser();

  const inviteSlug = request.cookies.get('gp_invite_slug')?.value;

  if (inviteSlug && user && !request.nextUrl.pathname.includes('/confirmed')) {
    const serviceDb = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { getAll: () => [], setAll: () => {} },
        auth: { persistSession: false },
      },
    );

    await serviceDb
      .from('invitations')
      .update({ status: 'accepted', user_id: user.id, responded_at: new Date().toISOString() })
      .eq('slug', inviteSlug)
      .eq('status', 'pending_signup');

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/invite/${inviteSlug}/confirmed`;
    redirectUrl.search = '';

    const redirectResponse = NextResponse.redirect(redirectUrl);
    sessionCookies.forEach(({ name, value, options }) =>
      redirectResponse.cookies.set(name, value, options),
    );
    redirectResponse.cookies.delete('gp_invite_slug');
    return redirectResponse;
  }

  return supabaseResponse;
}
