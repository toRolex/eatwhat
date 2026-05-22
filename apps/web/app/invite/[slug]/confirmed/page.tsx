import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getInvitationBySlug, getInvitationByToken, getEventById } from '@groupplan/db';

export const metadata: Metadata = { title: 'Invite confirmed' };

interface Props {
  params: Promise<{ slug: string }>;
}

interface Attendee {
  name: string;
  avatarUrl: string | null;
}

interface AttendeeRow {
  name: string;
  users?: unknown;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '');
}

function formatDate(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function mapAttendees(rows: AttendeeRow[]): Attendee[] {
  return rows.map((row) => {
    const userData = (Array.isArray(row.users) ? row.users[0] : row.users) as unknown;
    const avatarUrl = (userData as { avatar_url?: string | null } | null)?.avatar_url ?? null;
    return { name: row.name, avatarUrl };
  });
}

export default async function ConfirmedPage({ params }: Props) {
  const { slug } = await params;
  const db = createServiceClient();

  const { data: invitation } = slug.length === 64
    ? await getInvitationByToken(db, slug)
    : await getInvitationBySlug(db, slug);
  if (!invitation) notFound();

  const { data: event } = await getEventById(db, invitation.event_id);
  if (!event) notFound();

  const [{ data: host }, { data: attendeeRows }] = await Promise.all([
    db
      .from('users')
      .select('name')
      .eq('id', event.host_id)
      .single(),
    db
      .from('invitations')
      .select('name, users(avatar_url)')
      .eq('event_id', event.id)
      .eq('status', 'accepted')
      .order('responded_at', { ascending: true }),
  ]);

  const hostName = host?.name ?? 'Your host';
  const attendees = mapAttendees((attendeeRows ?? []) as unknown as AttendeeRow[]);
  const visibleAttendees = attendees.slice(0, 6);
  const extraAttendees = Math.max(0, attendees.length - visibleAttendees.length);
  const dateDisplay = event.date_flexible ? 'Date flexible' : formatDate(event.proposed_date);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <section style={{ width: '100%', maxWidth: 460, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', boxShadow: 'var(--sh)', padding: '32px 28px', textAlign: 'center', animation: 'fu .35s var(--sp) both' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 44, marginBottom: 22 }}>
          {visibleAttendees.map((attendee, index) => (
            <div
              key={`${attendee.name}-${index}`}
              title={attendee.name}
              style={{ width: 44, height: 44, marginLeft: index === 0 ? 0 : -12, borderRadius: '50%', border: '2px solid var(--surface)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', fontFamily: 'var(--fb)', fontSize: 12, fontWeight: 700, overflow: 'hidden' }}
            >
              {attendee.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={attendee.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials(attendee.name)
              )}
            </div>
          ))}
          {extraAttendees > 0 && (
            <div style={{ width: 44, height: 44, marginLeft: -12, borderRadius: '50%', border: '2px solid var(--surface)', background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'var(--fb)' }}>
              +{extraAttendees}
            </div>
          )}
        </div>

        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--fb)', marginBottom: 8 }}>
          {hostName} is expecting you
        </div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 30, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.1 }}>
          {event.title}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 26px' }}>
          {dateDisplay}
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          <Link href={`/invite/${slug}`} style={{ padding: '13px 16px', borderRadius: 'var(--rs)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--fb)', textDecoration: 'none' }}>
            View Event
          </Link>
          <Link href={`/invite/${slug}/preferences`} style={{ padding: '13px 16px', borderRadius: 'var(--rs)', border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--fb)', textDecoration: 'none' }}>
            Set Preferences
          </Link>
        </div>
      </section>
    </main>
  );
}
