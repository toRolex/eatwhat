import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MagicLinkSchema } from '@groupplan/types';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = MagicLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
