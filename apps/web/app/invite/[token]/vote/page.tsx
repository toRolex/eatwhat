import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getInvitationByToken, getProposalsByEvent } from '@groupplan/db';
import { getEventById } from '@groupplan/db';
import VotingInterface from '@/components/voting/VotingInterface';

export const metadata: Metadata = { title: 'Vote' };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function VotePage({ params }: Props) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: invitation } = await getInvitationByToken(db as never, token);
  if (!invitation) notFound();

  const { data: event } = await getEventById(db as never, invitation.event_id);
  if (!event || event.status !== 'deciding') notFound();

  const { data: proposals } = await getProposalsByEvent(db as never, invitation.event_id);
  if (!proposals?.length) notFound();

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-zinc-900">Pick your favourite</h1>
        <p className="text-sm text-zinc-500">Rank the options 1–3. Your #1 carries the most weight.</p>
        <VotingInterface proposals={proposals} invitationId={invitation.id} token={token} />
      </div>
    </main>
  );
}
