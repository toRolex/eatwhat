import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Log viewer' };

export default function LogsPage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 8px' }}>Log viewer</h1>
      <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 28px' }}>AI logs not available in SQLite mode.</p>
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--fb)', background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)' }}>
        No logs available. AI pipeline is stubbed in SQLite mode.
      </div>
    </main>
  );
}
