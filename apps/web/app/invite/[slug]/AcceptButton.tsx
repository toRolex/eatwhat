'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  slug: string;
  alreadyAccepted: boolean;
}

interface AcceptResponse {
  redirect?: string;
  error?: string;
}

export default function AcceptButton({ slug, alreadyAccepted }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acceptInvite() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/invite/${slug}/accept`, { method: 'POST' });
    const data = (await res.json().catch((): AcceptResponse => ({}))) as AcceptResponse;

    if (!res.ok || !data.redirect) {
      setLoading(false);
      setError(data.error ?? 'Something went wrong');
      return;
    }

    router.push(data.redirect);
  }

  if (alreadyAccepted) {
    return (
      <div style={{ padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--rs)', border: '1px solid oklch(72% .15 148)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'oklch(42% .15 148)', fontFamily: 'var(--fb)', marginBottom: 2 }}>
          You&apos;re going
        </div>
        <p style={{ fontSize: 12, color: 'oklch(42% .15 148)', fontFamily: 'var(--fb)', margin: 0 }}>
          Your spot is confirmed. You can still update your preferences before the host finalizes.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="invite-accept-btn" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--rs)', background: 'var(--surface)', border: '1px solid oklch(72% .15 26)' }}>
          <p style={{ fontSize: 12, color: 'oklch(48% .2 26)', fontFamily: 'var(--fb)', margin: 0 }}>{error}</p>
        </div>
      )}
      <button
        type="button"
        onClick={acceptInvite}
        disabled={loading}
        style={{
          width: '100%',
          padding: '13px 16px',
          borderRadius: 'var(--rs)',
          border: 'none',
          background: 'var(--text)',
          color: 'var(--bg)',
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'var(--fb)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.65 : 1,
          transition: 'opacity .15s',
        }}
      >
        {loading ? 'Confirming...' : 'Accept invite'}
      </button>
    </div>
  );
}
