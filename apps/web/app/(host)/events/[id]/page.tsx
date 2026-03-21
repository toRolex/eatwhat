import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getEventById } from '@groupplan/db';

export const metadata: Metadata = { title: 'Manage event' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await getEventById(supabase as never, id);

  if (!event) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-zinc-400 capitalize">{event.status}</p>
        <h1 className="text-2xl font-bold text-zinc-900">{event.title}</h1>
        {event.description && (
          <p className="text-zinc-500">{event.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/events/${id}/invite`}
          className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          Manage invites
        </Link>
        <Link
          href={`/e/${event.slug}`}
          className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium hover:bg-zinc-50 transition-colors"
        >
          View status page
        </Link>
        {(event.status === 'deciding' || event.status === 'finalized') && (
          <Link
            href={`/events/${id}/results`}
            className="px-4 py-2 rounded-lg border border-zinc-300 text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            View results
          </Link>
        )}
      </div>
    </main>
  );
}
