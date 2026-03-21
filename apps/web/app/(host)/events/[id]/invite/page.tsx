import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEventById, getInvitationsByEvent } from '@groupplan/db';
import InviteManager from '@/components/forms/InviteManager';

export const metadata: Metadata = { title: 'Manage invites' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await getEventById(supabase as never, id);

  if (!event) notFound();

  const { data: invitations } = await getInvitationsByEvent(supabase as never, id);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">Invites — {event.title}</h1>
      <InviteManager eventId={id} initialInvitations={invitations ?? []} />
    </main>
  );
}
