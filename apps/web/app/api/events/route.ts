import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateEventSchema } from '@groupplan/types';
import { createEvent, getEventsByHost } from '@groupplan/db';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    + '-' + Math.random().toString(36).slice(2, 7);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: events, error } = await getEventsByHost(supabase as never, user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const slug = slugify(parsed.data.title);
  const { data: event, error } = await createEvent(supabase as never, user.id, parsed.data, slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ event }, { status: 201 });
}
