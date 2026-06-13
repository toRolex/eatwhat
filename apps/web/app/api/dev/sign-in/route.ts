import { NextResponse } from 'next/server';

// Stub: dev sign-in disabled in SQLite mode (no Supabase Auth)
export async function POST(request: Request) {
  const isDev = process.env.NODE_ENV === 'development';
  const bypassSecret = process.env.PREVIEW_BYPASS_SECRET;
  const providedSecret = request.headers.get('x-preview-secret');
  const hasValidBypass = bypassSecret && providedSecret === bypassSecret;

  if (!isDev && !hasValidBypass) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const body: unknown = await request.json();
  const email = typeof body === 'object' && body !== null && 'email' in body
    ? body.email
    : null;

  if (typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  // Supabase Auth not available — return a stub
  return NextResponse.json({
    message: 'Dev sign-in is disabled in SQLite mode. Supabase Auth has been removed.',
    action_link: '/',
  });
}
