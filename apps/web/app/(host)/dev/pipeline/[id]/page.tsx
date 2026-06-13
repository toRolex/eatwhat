import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventById } from '@/lib/db';

export const metadata: Metadata = { title: 'Pipeline inspector' };

export default async function PipelineInspectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: event } = getEventById(id);
  if (!event) notFound();

  const evt = event as Record<string, unknown>;

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 6 }}>
        <Link href="/dev/pipeline" style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none' }}>Back to events</Link>
      </div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 28, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 4px' }}>{evt.title as string}</h1>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '3px 8px', textTransform: 'capitalize' }}>{evt.status as string}</span>
      </div>

      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--fb)', background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)' }}>
        Pipeline v2 logs not available in SQLite mode.
      </div>
    </main>
  );
}
