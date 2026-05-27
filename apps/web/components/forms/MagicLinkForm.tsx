'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  redirectTo?: string;
}

export default function MagicLinkForm({ redirectTo }: Props) {
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirectTo }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Something went wrong');
      return;
    }

    router.push('/verify');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label htmlFor="email" style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7, fontFamily: 'var(--fb)' }}>
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--border2)', borderRadius: 'var(--rs)', fontSize: 14, fontFamily: 'var(--fb)', color: 'var(--text)', background: 'var(--bg)', outline: 'none', transition: 'border-color .15s', boxSizing: 'border-box' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        />
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'oklch(50% 0.18 26)', fontFamily: 'var(--fb)', margin: 0 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{ width: '100%', padding: '11px 0', borderRadius: 'var(--rs)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--fb)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'opacity .15s, transform .1s', letterSpacing: '-.01em' }}
        onMouseEnter={e => !loading && (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => !loading && (e.currentTarget.style.opacity = '1')}
      >
        {loading ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
  );
}
