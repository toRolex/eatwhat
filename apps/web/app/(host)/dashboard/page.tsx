import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getEventsByHost } from '@groupplan/db';
import { STATUS_COLORS } from '@/lib/event-status';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: events } = await getEventsByHost(supabase, user!.id);

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
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '40px 32px', boxShadow: 'var(--sh)', animation: 'fu .4s var(--sp) both' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--rs)', background: 'oklch(94% .04 148)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2v18M2 11h18" stroke="oklch(40% .13 148)" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: 22, letterSpacing: '-.02em', color: 'var(--text)', margin: '0 0 6px' }}>Plan your first dinner</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0, lineHeight: 1.6 }}>
                Spin up an event, share invite links, then let Claude pick the best restaurants for everyone&apos;s tastes.
              </p>
            </div>
          </div>

          {/* Three-step nudge */}
          <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { n: 1, t: 'Create the event', d: 'Title, location hint, and RSVP deadline.' },
              { n: 2, t: 'Invite guests',    d: 'Each gets a private link to RSVP and share preferences.' },
              { n: 3, t: 'Run AI synthesis', d: 'Real venues, ranked by Claude. Group votes, you finalize.' },
            ].map(s => (
              <li key={s.n} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 'var(--rs)', background: 'var(--bg)', border: '1px solid var(--border2)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--fb)', flexShrink: 0 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)' }}>{s.t}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', marginTop: 1 }}>{s.d}</div>
                </div>
              </li>
            ))}
          </ol>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/events/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 'var(--rs)', background: 'var(--text)', color: 'var(--bg)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', textDecoration: 'none', letterSpacing: '-.01em' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Create your first event
            </Link>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', padding: '11px 18px', borderRadius: 'var(--rs)', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border2)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', textDecoration: 'none', boxShadow: 'var(--sh)' }}>
              See the demo first
            </Link>
          </div>
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
                <span style={{ fontSize: 11, fontWeight: 500, color: STATUS_COLORS[event.status] ?? 'var(--muted)', fontFamily: 'var(--fb)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 'var(--rs)', padding: '3px 8px', textTransform: 'capitalize', flexShrink: 0 }}>
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
