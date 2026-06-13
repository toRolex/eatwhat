import { NextResponse } from 'next/server';
import { getProposalsByEvent } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;

  const { data: proposals, error } = getProposalsByEvent(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ proposals: proposals ?? [] });
}
