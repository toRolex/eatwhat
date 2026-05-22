import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getEventsByHost } from '@groupplan/db';

export const metadata: Metadata = { title: 'Pipeline inspector' };

export default async function PipelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: events } = await getEventsByHost(supabase, user!.id);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 8px' }}>Pipeline inspector</h1>
      <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 28px' }}>Select an event to inspect its pipeline runs.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(events ?? []).map((event, i) => (
          <Link
            key={event.id}
            href={'/dev/pipeline/' + event.id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderRadius: 'var(--r)', border: '1px solid var(--border2)', background: 'var(--surface)', textDecoration: 'none', boxShadow: 'var(--sh)', animation: 'fu .35s var(--sp) ' + (i * 0.05) + 's both' }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)', letterSpacing: '-.01em' }}>{event.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', marginTop: 2 }}>
                RSVP by {new Date(event.rsvp_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', fontFamily: 'var(--fb)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '3px 8px', textTransform: 'capitalize', flexShrink: 0 }}>
              {event.status}
            </span>
          </Link>
        ))}
        {(!events || events.length === 0) && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--fb)' }}>No events found.</div>
        )}
      </div>
    </main>
  );
}
