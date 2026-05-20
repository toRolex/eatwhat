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

  const deadlinePassed = new Date(event.rsvp_deadline) < new Date();
  const deadlineDisplay = new Date(event.rsvp_deadline).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', boxShadow: 'var(--sh)', padding: '32px 32px 28px', animation: 'fu .35s var(--sp) both' }}>

          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, fontFamily: 'var(--fb)' }}>
            You&apos;re invited
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 30, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.1 }}>
            {event.title}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 24px' }}>
            Hi {invitation.name} — please respond by <strong style={{ color: 'var(--text)' }}>{deadlineDisplay}</strong>.
          </p>

          {event.description && (
            <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.55, margin: '0 0 24px', padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--rs)', borderLeft: '2px solid var(--border2)' }}>
              {event.description}
            </p>
          )}

          {deadlinePassed ? (
            <div style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 'var(--rs)', border: '1px solid var(--border2)' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0 }}>
                The RSVP deadline has passed.
              </p>
            </div>
          ) : (
            <RSVPForm token={token} currentStatus={invitation.status} />
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>
          Powered by GroupPlan
        </div>
      </div>
    </main>
  );
}
