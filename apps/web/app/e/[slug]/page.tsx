import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getEventBySlug, getInvitationsByEvent } from '@groupplan/db';
import GuestStatusList from '@/components/realtime/GuestStatusList';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = createServiceClient();
  const { data: event } = await getEventBySlug(db as never, slug);
  return { title: event?.title ?? 'Event' };
}

export default async function EventStatusPage({ params }: Props) {
  const { slug } = await params;
  const db = createServiceClient();

  const { data: event } = await getEventBySlug(db as never, slug);
  if (!event) notFound();

  const { data: invitations } = await getInvitationsByEvent(db as never, event.id);

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="space-y-1">
          <p className="text-xs text-zinc-400 uppercase tracking-wide capitalize">{event.status}</p>
          <h1 className="text-3xl font-bold text-zinc-900">{event.title}</h1>
          {event.description && (
            <p className="text-zinc-500">{event.description}</p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">
            Guest status
          </h2>
          {/* Subscribes to Supabase Realtime for live RSVP updates */}
          <GuestStatusList
            eventId={event.id}
            initialInvitations={invitations ?? []}
          />
        </div>
      </div>
    </main>
  );
}
