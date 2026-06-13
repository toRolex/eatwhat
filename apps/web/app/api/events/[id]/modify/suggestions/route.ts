import { NextResponse } from 'next/server';
import { getModificationSuggestionsByEvent } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');

  const { data: suggestions } = getModificationSuggestionsByEvent(
    id,
    statusFilter ? { status: statusFilter } : undefined,
  );

  return NextResponse.json({ suggestions: suggestions ?? [] });
}
