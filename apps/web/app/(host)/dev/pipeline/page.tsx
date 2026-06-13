import type { Metadata } from 'next';
import { getEventsByHost } from '@/lib/db';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Pipeline inspector' };

export default async function PipelinePage() {
  const hostId = 'demo-host';
  const { data: events } = getEventsByHost(hostId);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 8px' }}>Pipeline inspector</h1>
      <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 28px' }}>Pipeline v2 logs disabled in SQLite mode.</p>
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--fb)', background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)' }}>
        Pipeline logs not available. AI pipeline is stubbed in SQLite mode.
      </div>
    </main>
  );
}
