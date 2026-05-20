import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Check your email' };

export default function VerifyPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center', animation: 'si .45s var(--sp) both' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'oklch(92% .06 228)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
            <rect x="1" y="1" width="24" height="18" rx="3" stroke="oklch(38% .14 228)" strokeWidth="1.5"/>
            <path d="M1 5l12 8 12-8" stroke="oklch(38% .14 228)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 28, letterSpacing: '-.03em', color: 'var(--text)', marginBottom: 8 }}>Check your email</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 24, fontFamily: 'var(--fb)' }}>
          We sent a magic link to your inbox.<br />Click it to sign in — expires in 1 hour.
        </p>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '14px 18px', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>
          Didn&apos;t get it? Check your spam folder or{' '}
          <a href="/login" style={{ color: 'var(--text)', fontWeight: 500, textDecoration: 'none' }}>try again</a>.
        </div>
      </div>
    </main>
  );
}
