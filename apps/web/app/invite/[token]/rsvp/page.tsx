import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getInvitationByToken } from '@groupplan/db';
import { getEventById } from '@groupplan/db';
import RSVPForm from '@/components/forms/RSVPForm';

export const metadata: Metadata = { title: 'RSVP' };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function RSVPPage({ params }: Props) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: invitation } = await getInvitationByToken(db as never, token);
  if (!invitation) notFound();

  const { data: event } = await getEventById(db as never, invitation.event_id);
  if (!event) notFound();

  // Deadline passed and RSVP still pending — no changes allowed
  const deadlinePassed = new Date(event.rsvp_deadline) < new Date();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{event.title}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            RSVP by {new Date(event.rsvp_deadline).toLocaleDateString()}
          </p>
        </div>
        {deadlinePassed ? (
          <p className="text-sm text-zinc-500">The RSVP deadline has passed.</p>
        ) : (
          <RSVPForm token={token} currentStatus={invitation.status} />
        )}
      </div>
    </main>
  );
}
