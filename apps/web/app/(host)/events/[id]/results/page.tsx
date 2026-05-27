import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getEventById, getProposalsByEvent } from '@groupplan/db';
import FinalizeFlow from '@/components/forms/FinalizeFlow';

export const metadata: Metadata = { title: 'Results' };

interface Props {
  params: Promise<{ id: string }>;
}

const ACCENT_COLORS = ['var(--coral)', 'var(--sage)', 'var(--sky)', 'var(--amber)', 'var(--lav)'];

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await getEventById(supabase, id);

  if (!event) notFound();
  if (event.status !== 'deciding' && event.status !== 'finalized') notFound();

  const { data: proposals } = await getProposalsByEvent(supabase, id);
  const sorted = (proposals ?? []).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  // Look up finalized plan if any so we can highlight the winning card
  const { data: plan } = await supabase
    .from('finalized_plans').select('proposal_id').eq('event_id', id).maybeSingle();
  const winnerId = plan?.proposal_id ?? null;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

      <Link href={`/events/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none', marginBottom: 28 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {event.title}
      </Link>

      <div style={{ marginBottom: 32, animation: 'fu .35s var(--sp) both' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5, fontFamily: 'var(--fb)' }}>
          {event.status === 'finalized' ? 'Final result' : 'Voting in progress'}
        </div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, letterSpacing: '-.03em', color: 'var(--text)', margin: 0 }}>
          {event.status === 'finalized' ? 'The group chose…' : 'AI Recommendations'}
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((p, i) => {
          const accent = ACCENT_COLORS[i % ACCENT_COLORS.length] ?? 'var(--muted)';
          const isWinner = p.id === winnerId;
          return (
            <div
              key={p.id}
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--r)',
                border: `1px solid ${isWinner ? accent : 'var(--border2)'}`,
                padding: '18px 22px',
                boxShadow: isWinner ? `0 0 0 1px ${accent}, var(--sh)` : 'var(--sh)',
                animation: `fu .35s var(--sp) ${i * 0.06}s both`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--bg)', fontFamily: 'var(--fb)', flexShrink: 0 }}>
                  {p.rank ?? i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--fb)', letterSpacing: '-.01em' }}>{p.restaurant_name}</span>
                    {p.cuisine_type && <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>{p.cuisine_type}</span>}
                    {p.price_range && <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>{p.price_range}</span>}
                  </div>
                  {p.reasoning && (
                    <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '6px 0 0', lineHeight: 1.55 }}>{p.reasoning}</p>
                  )}
                  {isWinner && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 11, fontWeight: 600, color: accent, fontFamily: 'var(--fb)', background: 'var(--bg)', border: `1px solid ${accent}`, borderRadius: 6, padding: '3px 9px' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Group pick
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--r)',
              border: '1px solid var(--border2)',
              padding: '24px 22px',
              boxShadow: 'var(--sh)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--rs)',
                background: 'oklch(92% .06 228)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7.5" stroke="oklch(38% .14 228)" strokeWidth="1.5" />
                <path d="M9 5v4.5l2.5 2.5" stroke="oklch(38% .14 228)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--fb)', margin: '14px 0 6px' }}>
              Waiting for AI recommendations
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0, lineHeight: 1.55 }}>
              Trigger the AI analysis from the event page once all RSVPs are in.
            </p>
            <Link
              href={`/events/${id}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 16, fontSize: 12, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none' }}
            >
              ← Back to event
            </Link>
          </div>
        )}
      </div>

      <FinalizeFlow
        eventId={id}
        proposedDate={event.proposed_date ?? null}
        status={event.status as 'deciding' | 'finalized'}
        finalizedId={winnerId ?? undefined}
      />
    </main>
  );
}
