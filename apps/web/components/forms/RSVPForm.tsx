'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InviteStatus } from '@groupplan/types';

interface Props {
  token: string;
  currentStatus: InviteStatus;
}

export default function RSVPForm({ token, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<'accepted' | 'declined' | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function respond(status: 'accepted' | 'declined') {
    setLoading(status);
    setError(null);

    const res = await fetch(`/api/invite/${token}/rsvp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    });

    if (!res.ok) {
      setLoading(null);
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong');
      return;
    }

    if (status === 'accepted') {
      router.push(`/invite/${token}/preferences`);
    } else {
      router.refresh();
    }
  }

  if (currentStatus === 'declined') {
    return (
      <div style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 'var(--rs)', border: '1px solid var(--border2)' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0 }}>
          You declined this invitation. Changed your mind? Reply to the host directly.
        </p>
      </div>
    );
  }

  if (currentStatus === 'accepted') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--rs)', border: '1px solid oklch(72% .15 148)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'oklch(42% .15 148)', fontFamily: 'var(--fb)', marginBottom: 2 }}>
            ✓ You&apos;re going
          </div>
          <p style={{ fontSize: 12, color: 'oklch(42% .15 148)', fontFamily: 'var(--fb)', margin: 0 }}>
            Next: tell us your dietary needs and budget so the picks fit you.
          </p>
        </div>
        <button
          onClick={() => router.push(`/invite/${token}/preferences`)}
          style={{ padding: '12px 0', borderRadius: 'var(--rs)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--fb)', cursor: 'pointer' }}
        >
          Share preferences
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--rs)', background: 'var(--surface)', border: '1px solid oklch(72% .15 26)' }}>
          <p style={{ fontSize: 12, color: 'oklch(48% .2 26)', fontFamily: 'var(--fb)', margin: 0 }}>{error}</p>
        </div>
      )}
      <button
        onClick={() => respond('accepted')}
        disabled={loading !== null}
        style={{
          padding: '13px 0', borderRadius: 'var(--rs)', border: 'none',
          background: 'var(--text)', color: 'var(--bg)',
          fontSize: 14, fontWeight: 600, fontFamily: 'var(--fb)',
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'accepted' ? 0.6 : 1, transition: 'opacity .15s',
        }}
      >
        {loading === 'accepted' ? 'Saving…' : 'Accept invite'}
      </button>
      <button
        onClick={() => respond('declined')}
        disabled={loading !== null}
        style={{
          padding: '13px 0', borderRadius: 'var(--rs)',
          border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)',
          fontSize: 14, fontWeight: 600, fontFamily: 'var(--fb)',
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'declined' ? 0.6 : 1, transition: 'opacity .15s, border-color .15s',
        }}
        onMouseEnter={e => !loading && (e.currentTarget.style.borderColor = 'var(--text)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
      >
        {loading === 'declined' ? 'Saving…' : "Can't make it"}
      </button>
    </div>
  );
}
