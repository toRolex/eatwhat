import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MagicLinkSchema } from '@groupplan/types';
import { track } from '@/lib/funnel';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = MagicLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const supabase = await createClient();
  const redirectTo = typeof body.redirectTo === 'string' && body.redirectTo.startsWith('/') && !body.redirectTo.startsWith('//')
    ? body.redirectTo
    : '/dashboard';
  const callbackUrl = new URL('/api/auth/callback', process.env.NEXT_PUBLIC_APP_URL);
  callbackUrl.searchParams.set('redirectTo', redirectTo);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  void track('otp_sent', { metadata: { email: parsed.data.email } });
  return NextResponse.json({ ok: true });
}
