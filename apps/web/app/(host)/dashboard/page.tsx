import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getEventsByHost } from '@groupplan/db';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: events } = await getEventsByHost(supabase as never, user!.id);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Your events</h1>
        <Link
          href="/events/new"
          className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          New event
        </Link>
      </div>

      {!events?.length ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg">No events yet.</p>
          <p className="text-sm mt-1">Create one to get started.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="block p-4 rounded-xl border border-zinc-200 hover:border-zinc-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900">{event.title}</span>
                  <span className="text-xs text-zinc-400 capitalize">{event.status}</span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  RSVP by {new Date(event.rsvp_deadline).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
