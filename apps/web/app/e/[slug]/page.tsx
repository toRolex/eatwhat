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

const STATUS_COLORS: Record<string, string> = {
  collecting: 'oklch(60% 0.15 148)',
  deciding:   'oklch(68% 0.15 72)',
  finalized:  'oklch(58% 0.14 228)',
};

const STATUS_LABELS: Record<string, string> = {
  collecting: 'Collecting RSVPs',
  deciding:   'Voting in progress',
  finalized:  'Finalized',
};

export default async function EventStatusPage({ params }: Props) {
  const { slug } = await params;
  const db = createServiceClient();

  const { data: event } = await getEventBySlug(db as never, slug);
  if (!event) notFound();

  const { data: invitations } = await getInvitationsByEvent(db as never, event.id);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px 64px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Event header */}
        <div style={{ marginBottom: 32, animation: 'fu .4s var(--sp) both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '4px 10px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border2)', fontSize: 11, fontWeight: 500, color: STATUS_COLORS[event.status] ?? 'var(--muted)', fontFamily: 'var(--fb)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[event.status] ?? 'var(--muted)', display: 'inline-block' }} />
            {STATUS_LABELS[event.status] ?? event.status}
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 36, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.05 }}>{event.title}</h1>
          {event.description && (
            <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0, lineHeight: 1.6 }}>{event.description}</p>
          )}
        </div>

        {/* Guest status card */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '20px 24px', boxShadow: 'var(--sh)', animation: 'fu .45s var(--sp) .06s both' }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16, fontFamily: 'var(--fb)' }}>
            Guest status · live
          </div>
          <GuestStatusList eventId={event.id} initialInvitations={invitations ?? []} />
        </div>

        {/* RSVP deadline */}
        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textAlign: 'center' }}>
          RSVP by {new Date(event.rsvp_deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
      </div>
    </main>
  );
}
