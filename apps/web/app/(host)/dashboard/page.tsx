import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getEventsByHost } from '@groupplan/db';

export const metadata: Metadata = { title: 'Dashboard' };

const STATUS_COLORS: Record<string, string> = {
  collecting: 'oklch(60% 0.15 148)',
  deciding:   'oklch(68% 0.15 72)',
  finalized:  'oklch(58% 0.14 228)',
  cancelled:  'oklch(58% 0.18 26)',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: events } = await getEventsByHost(supabase as never, user!.id);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5, fontFamily: 'var(--fb)' }}>Dashboard</div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, letterSpacing: '-.03em', color: 'var(--text)', lineHeight: 1.05, margin: 0 }}>Your events</h1>
        </div>
        <Link
          href="/events/new"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 'var(--rs)', background: 'var(--text)', color: 'var(--bg)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', textDecoration: 'none', transition: 'opacity .15s', letterSpacing: '-.01em' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          New event
        </Link>
      </div>

      {/* Event list */}
      {!events?.length ? (
        <div style={{ textAlign: 'center', padding: '64px 0', animation: 'fi .4s var(--eo) both' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="4" width="18" height="16" rx="3" stroke="var(--muted)" strokeWidth="1.5"/><path d="M7 2v4M15 2v4M2 9h18" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)', margin: '0 0 6px' }}>No events yet</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0 }}>Create one to start planning with your group.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((event, i) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              style={{ display: 'block', padding: '16px 20px', borderRadius: 'var(--r)', border: '1px solid var(--border2)', background: 'var(--surface)', textDecoration: 'none', boxShadow: 'var(--sh)', transition: 'box-shadow .2s, border-color .2s', animation: `fu .35s var(--sp) ${i * 0.05}s both` }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shh)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--sh)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)', letterSpacing: '-.01em' }}>{event.title}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: STATUS_COLORS[event.status] ?? 'var(--muted)', fontFamily: 'var(--fb)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '3px 8px', textTransform: 'capitalize', flexShrink: 0 }}>
                  {event.status}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '5px 0 0' }}>
                RSVP by {new Date(event.rsvp_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
