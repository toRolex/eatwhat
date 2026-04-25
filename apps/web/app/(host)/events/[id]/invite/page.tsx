import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
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
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

      <Link href={`/events/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none', marginBottom: 28 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {event.title}
      </Link>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5, fontFamily: 'var(--fb)' }}>Invitations</div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, letterSpacing: '-.03em', color: 'var(--text)', margin: 0 }}>Manage guests</h1>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '28px 28px 24px', boxShadow: 'var(--sh)', animation: 'fu .4s var(--sp) both' }}>
        <InviteManager eventId={id} initialInvitations={invitations ?? []} />
      </div>
    </main>
  );
}
