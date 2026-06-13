import { NextResponse } from 'next/server';

// Stub: Supabase auth callback disabled in SQLite mode
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/', request.url));
}
