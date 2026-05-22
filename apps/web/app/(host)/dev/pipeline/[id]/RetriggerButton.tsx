'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RetriggerButton({ eventId, disabled }: { eventId: string; disabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/events/' + eventId + '/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_rerun: true }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (res.ok) {
        setMsg('Pipeline triggered. Refresh in ~30s to see new run.');
        router.refresh();
      } else {
        setMsg(data.error ?? 'Failed to trigger pipeline.');
      }
    } catch {
      setMsg('Failed to trigger pipeline.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        style={{
          padding: '8px 16px', borderRadius: 'var(--rs)', border: '1px solid var(--border2)',
          background: disabled ? 'var(--bg2)' : 'var(--text)', color: disabled ? 'var(--muted)' : 'var(--bg)',
          fontSize: 12, fontWeight: 600, fontFamily: 'var(--fb)', cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Triggering...' : 'Re-trigger pipeline'}
      </button>
      {msg && <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>{msg}</span>}
    </div>
  );
}
