import { NextResponse } from 'next/server';
import { getModificationHistory, getPlanVersion } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;

  const { data: versions } = getModificationHistory(id);
  const { data: currentVersion } = getPlanVersion(id);

  return NextResponse.json({ versions: versions ?? [], current_version: currentVersion ?? 1 });
}
