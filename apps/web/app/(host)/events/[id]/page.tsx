import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getEventById, getInvitationsByEvent } from '@groupplan/db';
import AITriggerButton from '@/components/forms/AITriggerButton';
import UsageBadge from '@/components/host/UsageBadge';
import { maybeAutoFinalize } from '@/lib/auto-finalize';
import { STATUS_COLORS } from '@/lib/event-status';

export const metadata: Metadata = { title: 'Manage event' };

interface Props {
  params: Promise<{ id: string }>;
}


export default async function EventPage({ params }: Props) {
  const { id } = await params;
  await maybeAutoFinalize(id).catch(() => {});
  const supabase = await createClient();
  const { data: event } = await getEventById(supabase, id);

  if (!event) notFound();

  const { data: invitations } = await getInvitationsByEvent(supabase, id);
  const guestCounts = (invitations ?? []).reduce(
    (acc, inv) => {
      acc.total += 1;
      if (inv.status === 'accepted')      acc.accepted += 1;
      else if (inv.status === 'declined') acc.declined += 1;
      else                                acc.pending  += 1;
      return acc;
    },
    { total: 0, accepted: 0, declined: 0, pending: 0 },
  );

  const actions = [
    { href: `/events/${id}/invite`, label: 'Manage invites', primary: true, testId: 'event-manage-invites-btn' },
    { href: `/e/${event.slug}`, label: 'Status page', primary: false, testId: undefined },
    ...(event.status === 'deciding' || event.status === 'finalized'
      ? [{ href: `/events/${id}/results`, label: 'View results', primary: false, testId: 'event-view-results-btn' }]
      : []),
  ];

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

      {/* Back */}
      <Link href="/dashboard" className="event-back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none', marginBottom: 28, transition: 'color .15s' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        All events
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 32, animation: 'fu .35s var(--sp) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span data-testid="event-status-badge" style={{ fontSize: 11, fontWeight: 500, color: STATUS_COLORS[event.status] ?? 'var(--muted)', fontFamily: 'var(--fb)', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 6, padding: '3px 9px', textTransform: 'capitalize' }}>
            {event.status}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 34, letterSpacing: '-.03em', color: 'var(--text)', lineHeight: 1.05, margin: '0 0 8px' }}>{event.title}</h1>
        {event.description && (
          <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0, lineHeight: 1.6 }}>{event.description}</p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 40 }}>
        {actions.map(a => (
          <Link
            key={a.href}
            href={a.href}
            data-testid={a.testId}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '9px 18px',
              borderRadius: 'var(--rs)',
              background: a.primary ? 'var(--text)' : 'var(--surface)',
              color: a.primary ? 'var(--bg)' : 'var(--text)',
              border: `1px solid ${a.primary ? 'transparent' : 'var(--border2)'}`,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--fb)',
              textDecoration: 'none',
              boxShadow: a.primary ? 'none' : 'var(--sh)',
              transition: 'opacity .15s',
              letterSpacing: '-.01em',
            }}
          >
            {a.label}
          </Link>
        ))}
      </div>

      <UsageBadge eventId={id} />

      {/* Guest summary */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '20px 24px', boxShadow: 'var(--sh)', animation: 'fu .4s var(--sp) .03s both', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: 'var(--fb)' }}>Guests</div>
          <Link href={`/events/${id}/invite`} className="event-manage-link" style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none' }}>Manage →</Link>
        </div>
        {guestCounts.total === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.55 }}>
            No invites sent yet. <Link href={`/events/${id}/invite`} style={{ color: 'var(--text)', fontWeight: 500 }}>Invite guests →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 28, color: 'oklch(60% 0.15 148)', lineHeight: 1 }}>{guestCounts.accepted}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Confirmed</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 28, color: 'var(--muted)', lineHeight: 1 }}>{guestCounts.pending}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Pending</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 28, color: 'oklch(58% 0.18 26)', lineHeight: 1 }}>{guestCounts.declined}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Declined</div>
            </div>
            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>{guestCounts.total} invited</div>
            </div>
          </div>
        )}
      </div>

      {/* AI trigger — available while collecting (initial run) or deciding (re-run) */}
      {(event.status === 'collecting' || event.status === 'deciding') && (
        <AITriggerButton eventId={id} locationHint={event.location_hint} eventStatus={event.status} />
      )}

      {/* Event details card */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '20px 24px', boxShadow: 'var(--sh)', animation: 'fu .4s var(--sp) .05s both' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14, fontFamily: 'var(--fb)' }}>Event details</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>RSVP deadline</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--fb)' }}>
              {new Date(event.rsvp_deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div style={{ height: 1, background: 'var(--border2)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>Vote deadline</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: event.vote_deadline ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--fb)' }}>
              {event.vote_deadline
                ? new Date(event.vote_deadline).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                : 'No deadline (manual finalize)'}
            </span>
          </div>
          <div style={{ height: 1, background: 'var(--border2)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>Public link</span>
            <a href={`/e/${event.slug}`} style={{ fontSize: 13, color: 'var(--sky)', fontFamily: 'var(--fb)', textDecoration: 'none' }}>/e/{event.slug}</a>
          </div>
        </div>
      </div>
    </main>
  );
}
