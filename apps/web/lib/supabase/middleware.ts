import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  // BETA UI BYPASS: Skip Supabase auth checks since the DB is not configured locally yet
  return NextResponse.next({ request });
}
