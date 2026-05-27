import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const body: unknown = await request.json();
  const email = typeof body === 'object' && body !== null && 'email' in body
    ? body.email
    : null;

  if (typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: new URL('/api/auth/callback', process.env.NEXT_PUBLIC_APP_URL).toString(),
    },
  });

  if (error) {
    return NextResponse.json({ error: 'Unable to generate sign-in link' }, { status: 500 });
  }

  const callbackUrl = new URL('/api/auth/callback', process.env.NEXT_PUBLIC_APP_URL);
  callbackUrl.searchParams.set('token_hash', data.properties.hashed_token);
  callbackUrl.searchParams.set('type', 'magiclink');
  return NextResponse.json({ action_link: callbackUrl.toString() });
}
