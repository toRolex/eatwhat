import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProposalsByEvent } from '@groupplan/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: proposals, error } = await getProposalsByEvent(supabase, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ proposals: proposals ?? [] });
}
