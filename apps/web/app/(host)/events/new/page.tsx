import type { Metadata } from 'next';
import Link from 'next/link';
import EventCreateForm from '@/components/forms/EventCreateForm';

export const metadata: Metadata = { title: 'Create event' };

export default function NewEventPage() {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>

      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none', marginBottom: 28 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Dashboard
      </Link>

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5, fontFamily: 'var(--fb)' }}>New event</div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, letterSpacing: '-.03em', color: 'var(--text)', margin: 0 }}>
          Plan a dinner
        </h1>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '28px 28px 24px', boxShadow: 'var(--sh)', animation: 'fu .4s var(--sp) both' }}>
        <EventCreateForm />
      </div>
    </main>
  );
}
