import { NextResponse } from 'next/server';

// Stub: Supabase /me endpoint disabled in SQLite mode
export async function GET() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
