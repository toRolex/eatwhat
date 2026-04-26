import type { Metadata } from 'next';
import MagicLinkForm from '@/components/forms/MagicLinkForm';

export const metadata: Metadata = { title: 'GroupPlan — Group restaurant planning, simplified' };

const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 9l2.5 2.5L12 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Beautiful invites',
    body:  'Send polished invitations guests actually open. Choose from classic, minimal, or gradient templates.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2L11.1 7H16.5L12.2 10.2L13.8 15.5L9 12.3L4.2 15.5L5.8 10.2L1.5 7H6.9L9 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'AI-powered picks',
    body:  'Claude reads every guest\'s dietary needs and budget, then ranks real nearby venues against everyone\'s preferences.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6 2v3M12 2v3M2 9h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Group voting',
    body:  'Guests rank proposals with Borda count scoring. Live tally updates as votes come in — no spreadsheet required.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 1.5L11.3 6.2L16.5 7L12.7 10.7L13.6 16L9 13.5L4.4 16L5.3 10.7L1.5 7L6.7 6.2L9 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'One-click finalize',
    body:  'Pick the winner, confirm the time, and GroupPlan sends a calendar invite with maps link to everyone.',
  },
];

const STEPS = [
  { n: '1', label: 'Create an event', sub: 'Set location, date, and invite template in under a minute.' },
  { n: '2', label: 'Collect preferences', sub: 'Guests RSVP and share dietary needs, budget, and vibe.' },
  { n: '3', label: 'Let AI decide', sub: 'Claude picks top venues. Guests vote. You finalize in one click.' },
];

export default function LoginPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 0 80px' }}>

      {/* Nav strip */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="3" fill="var(--bg)"/><circle cx="9" cy="9" r="3" fill="var(--bg)" opacity=".5"/></svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--text)', fontFamily: 'var(--fb)' }}>GroupPlan</span>
        </div>
        <a href="/dashboard" style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none' }}>
          Sign in →
        </a>
      </div>

      {/* Hero */}
      <div className="gp-hero-grid" style={{ maxWidth: 900, margin: '0 auto', padding: '52px 24px 56px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
        <div style={{ animation: 'fu .5s var(--sp) both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: '4px 12px', borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border2)', fontSize: 11, fontWeight: 500, color: 'var(--lav)', fontFamily: 'var(--fb)' }}>
            ✦ Powered by Claude AI
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 48, letterSpacing: '-.035em', color: 'var(--text)', lineHeight: 1.05, margin: '0 0 18px' }}>
            Group dinners,<br /><em>finally easy.</em>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.65, margin: '0 0 28px', maxWidth: 400 }}>
            Stop the endless "where should we eat?" thread. GroupPlan collects everyone&apos;s preferences, finds real nearby restaurants, and helps your group decide — in minutes.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="#sign-in" style={{ display: 'inline-flex', alignItems: 'center', padding: '11px 22px', borderRadius: 'var(--rs)', background: 'var(--text)', color: 'var(--bg)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', textDecoration: 'none', letterSpacing: '-.01em' }}>
              Get started free →
            </a>
            <a href="/e/demo" style={{ display: 'inline-flex', alignItems: 'center', padding: '11px 22px', borderRadius: 'var(--rs)', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border2)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', textDecoration: 'none', letterSpacing: '-.01em' }}>
              See a live demo
            </a>
          </div>
        </div>

        {/* Sign-in card */}
        <div id="sign-in" style={{ animation: 'fu .5s var(--sp) .08s both' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '28px 28px 24px', boxShadow: 'var(--shh)' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6, fontFamily: 'var(--fb)' }}>Start planning</div>
              <h2 style={{ fontFamily: 'var(--fd)', fontSize: 24, letterSpacing: '-.03em', color: 'var(--text)', lineHeight: 1.05, margin: 0 }}>
                Sign in to<br /><em>GroupPlan</em>
              </h2>
            </div>
            <MagicLinkForm />
            <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '14px 0 0', lineHeight: 1.5 }}>
              No password needed — we&apos;ll email you a magic link.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 56px' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--fb)', marginBottom: 24, textAlign: 'center' }}>
          How it works
        </div>
        <div className="gp-step-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '20px 22px', boxShadow: 'var(--sh)', animation: `fu .45s var(--sp) ${i * 60 + 100}ms both` }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'var(--fb)', marginBottom: 12 }}>{s.n}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)', marginBottom: 6, letterSpacing: '-.01em' }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.55 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--fb)', marginBottom: 24, textAlign: 'center' }}>
          Everything included
        </div>
        <div className="gp-feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', padding: '20px 22px', boxShadow: 'var(--sh)', display: 'flex', gap: 14, alignItems: 'flex-start', animation: `fu .45s var(--sp) ${i * 60 + 200}ms both` }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)', marginBottom: 4, letterSpacing: '-.01em' }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', lineHeight: 1.55 }}>{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile styles */}
      <style>{`
        @media (max-width: 680px) {
          .gp-hero-grid { grid-template-columns: 1fr !important; }
          .gp-step-grid  { grid-template-columns: 1fr !important; }
          .gp-feat-grid  { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
