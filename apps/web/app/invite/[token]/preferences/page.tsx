import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getInvitationByToken, getPreferencesByInvitation } from '@groupplan/db';
import PreferenceForm from '@/components/forms/PreferenceForm';

export const metadata: Metadata = { title: 'Your preferences' };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PreferencesPage({ params }: Props) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: invitation } = await getInvitationByToken(db as never, token);
  if (!invitation) notFound();

  // Only accepted guests fill out preferences
  if (invitation.status !== 'accepted') {
    redirect(`/invite/${token}/rsvp`);
  }

  const { data: existing } = await getPreferencesByInvitation(db as never, invitation.id);

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Your preferences</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Help us find the perfect restaurant for everyone.
          </p>
        </div>
        <PreferenceForm token={token} existing={existing ?? null} />
      </div>
    </main>
  );
}
