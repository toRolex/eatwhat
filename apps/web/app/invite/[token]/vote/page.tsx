import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { getInvitationByToken, getProposalsByEvent } from '@groupplan/db';
import { getEventById } from '@groupplan/db';
import VotingInterface from '@/components/voting/VotingInterface';

export const metadata: Metadata = { title: 'Vote' };

interface Props {
  params: Promise<{ token: string }>;
}

const RANK_LABELS = ['#1 Top pick', '#2 Second', '#3 Third'];
const ACCENT = ['var(--amber)', 'var(--sage)', 'var(--sky)'];

export default async function VotePage({ params }: Props) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: invitation } = await getInvitationByToken(db as never, token);
  if (!invitation) notFound();

  const { data: event } = await getEventById(db as never, invitation.event_id);
  if (!event || event.status !== 'deciding') notFound();

  const { data: proposals } = await getProposalsByEvent(db as never, invitation.event_id);
  if (!proposals?.length) notFound();

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 64 }}>

      {/* Sticky header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border2)', padding: '18px 24px', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3, fontFamily: 'var(--fb)' }}>Voting open</div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: 20, letterSpacing: '-.03em', color: 'var(--text)', margin: 0 }}>{event.title}</h1>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 7, padding: '4px 10px', fontFamily: 'var(--fb)', flexShrink: 0 }}>
            {invitation.name}
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 24px 0' }}>

        {/* Intro */}
        <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.6, margin: '0 0 20px', animation: 'fu .35s var(--sp) both' }}>
          Rank the options <strong style={{ color: 'var(--text)' }}>#1 to #3</strong>. Your top pick carries the most weight in the final decision.
        </p>

        {/* Rank legend */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          {RANK_LABELS.map((label, i) => (
            <div key={label} style={{ flex: 1, padding: '6px 0', borderRadius: 'var(--rs)', background: 'var(--surface)', border: '1px solid var(--border2)', textAlign: 'center', fontSize: 11, fontFamily: 'var(--fb)', color: ACCENT[i] ?? 'var(--muted)', fontWeight: 600 }}>
              {label}
            </div>
          ))}
        </div>

        <VotingInterface proposals={proposals} invitationId={invitation.id} token={token} />

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href={`/invite/${token}`} style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none' }}>
            Back to invite
          </Link>
        </div>
      </div>
    </main>
  );
}
