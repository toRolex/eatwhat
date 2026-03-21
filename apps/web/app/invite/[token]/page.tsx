import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { getInvitationByToken } from '@groupplan/db';
import { getEventById } from '@groupplan/db';
import InviteView from '@/components/invite-templates/InviteView';
import PreviewBanner from '@/components/ui/PreviewBanner';

export const metadata: Metadata = { title: "You're invited" };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const serviceDb = createServiceClient();

  const { data: invitation } = await getInvitationByToken(serviceDb as never, token);
  if (!invitation) notFound();

  const { data: event } = await getEventById(serviceDb as never, invitation.event_id);
  if (!event) notFound();

  // Detect if an authenticated host is previewing their own invite page
  const authDb = await createClient();
  const { data: { user } } = await authDb.auth.getUser();
  const isHostPreview = user?.id === event.host_id;

  return (
    <>
      {isHostPreview && <PreviewBanner />}
      <InviteView
        invitation={invitation}
        event={event}
        templateId={event.template_id}
      />
    </>
  );
}
