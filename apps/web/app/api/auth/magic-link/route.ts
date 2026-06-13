import { NextResponse } from 'next/server';
import { MagicLinkSchema } from '@groupplan/types';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = MagicLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Supabase magic link disabled in SQLite mode — return ok for demo
  return NextResponse.json({ ok: true });
}
