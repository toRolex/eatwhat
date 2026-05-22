import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Dev tools' };

const TOOLS = [
  { href: '/dev/logs', title: 'Log viewer', description: 'Recent ai_logs rows - latency, tokens, cost, errors.' },
  { href: '/dev/costs', title: 'Cost dashboard', description: 'Spend by day, by stage, and by event.' },
  { href: '/dev/pipeline', title: 'Pipeline inspector', description: 'Per-event stage breakdown and re-trigger.' },
];

export default function DevPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 32px' }}>Dev tools</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {TOOLS.map((tool, i) => (
          <Link
            key={tool.href}
            href={tool.href}
            style={{ display: 'block', padding: '20px 24px', borderRadius: 'var(--r)', border: '1px solid var(--border2)', background: 'var(--surface)', textDecoration: 'none', boxShadow: 'var(--sh)', animation: 'fu .35s var(--sp) ' + (i * 0.05) + 's both' }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)', letterSpacing: '-.01em', marginBottom: 4 }}>{tool.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>{tool.description}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
