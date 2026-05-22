import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <section style={{ maxWidth: 400, width: '100%', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', boxShadow: 'var(--sh)', padding: '32px 28px', textAlign: 'center', animation: 'fu .35s var(--sp) both' }}>
        <div style={{ width: 48, height: 48, borderRadius: 'var(--rs)', background: 'var(--bg)', border: '1px solid var(--border2)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 12l-2 2a3 3 0 004.24 4.24l2-2" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M16 8l2-2a3 3 0 00-4.24-4.24l-2 2" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="7" y1="17" x2="17" y2="7" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--fb)', marginBottom: 8 }}>
          Invite not found
        </div>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 26, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.1 }}>
          This link isn&apos;t valid
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 24px', lineHeight: 1.6 }}>
          It may have expired or the URL might be incomplete. Ask your host to resend the invitation.
        </p>
        <Link
          href="/"
          style={{ display: 'inline-flex', alignItems: 'center', padding: '11px 20px', borderRadius: 'var(--rs)', background: 'var(--text)', color: 'var(--bg)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', textDecoration: 'none' }}
        >
          Go home
        </Link>
      </section>
    </main>
  );
}
