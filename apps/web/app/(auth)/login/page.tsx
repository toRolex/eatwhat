import type { Metadata } from 'next';
import MagicLinkForm from '@/components/forms/MagicLinkForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36, justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="3" fill="var(--bg)"/><circle cx="9" cy="9" r="3" fill="var(--bg)" opacity=".5"/></svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--text)', fontFamily: 'var(--fb)' }}>GroupPlan</span>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '28px 28px 24px', boxShadow: 'var(--sh)', animation: 'fu .45s var(--sp) both' }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Welcome back</div>
            <h1 style={{ fontFamily: 'var(--fd)', fontSize: 26, letterSpacing: '-.03em', color: 'var(--text)', lineHeight: 1.05 }}>
              Sign in to<br /><em>GroupPlan</em>
            </h1>
          </div>
          <MagicLinkForm />
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 16, fontFamily: 'var(--fb)' }}>
          No password needed — we'll email you a magic link.
        </p>
      </div>
    </main>
  );
}
