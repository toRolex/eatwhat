'use client';

import { useState } from 'react';
import type { Invitation } from '@groupplan/types';

const STATUS_DOT: Record<string, string> = {
  pending:  'oklch(72% 0.15 72)',
  accepted: 'oklch(60% 0.15 148)',
  declined: 'oklch(58% 0.18 26)',
};

const STATUS_LABEL: Record<string, string> = {
  pending:  'Pending',
  accepted: 'Going',
  declined: 'Declined',
};

interface Props {
  eventId: string;
  initialInvitations: Invitation[];
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--border2)',
  borderRadius: 'var(--rs)',
  fontSize: 13,
  fontFamily: 'var(--fb)',
  color: 'var(--text)',
  background: 'var(--bg)',
  outline: 'none',
  transition: 'border-color .15s',
  boxSizing: 'border-box',
};

export default function InviteManager({ eventId, initialInvitations }: Props) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [copied,      setCopied]      = useState<string | null>(null);

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/events/${eventId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guests: [{ name, email }] }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === 'string' ? data.error : 'Failed to send invite');
      return;
    }

    const { invitations: newInvites } = await res.json();
    setInvitations((prev) => [...prev, ...newInvites]);
    setName('');
    setEmail('');
  }

  function copyLink(token: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    navigator.clipboard.writeText(`${appUrl}/invite/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  const accepted = invitations.filter(i => i.status === 'accepted').length;
  const pending  = invitations.filter(i => i.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Stats row */}
      {invitations.length > 0 && (
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Going', val: accepted, color: STATUS_DOT['accepted'] },
            { label: 'Pending', val: pending, color: STATUS_DOT['pending'] },
            { label: 'Total', val: invitations.length, color: 'var(--muted)' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 22, fontFamily: 'var(--fd)', color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add guest form */}
      <form onSubmit={addGuest} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, fontFamily: 'var(--fb)' }}>Name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Alex" style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, fontFamily: 'var(--fb)' }}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="alex@example.com" style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          />
        </div>
        <button
          type="submit" disabled={loading}
          style={{ padding: '9px 18px', borderRadius: 'var(--rs)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap', transition: 'opacity .15s' }}
        >
          {loading ? '…' : 'Add guest'}
        </button>
      </form>

      {error && (
        <p style={{ fontSize: 12, color: 'oklch(50% 0.18 26)', fontFamily: 'var(--fb)', margin: 0 }}>{error}</p>
      )}

      {/* Guest list */}
      {invitations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--fb)' }}>
          No guests yet — add someone above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {invitations.map((inv) => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderRadius: 'var(--rs)', border: '1px solid var(--border2)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)', fontFamily: 'var(--fb)', flexShrink: 0 }}>
                  {(inv.name ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)', margin: 0 }}>{inv.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '2px 0 0' }}>{inv.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: STATUS_DOT[inv.status] ?? 'var(--muted)', fontFamily: 'var(--fb)' }}>
                  {STATUS_LABEL[inv.status] ?? inv.status}
                </span>
                <button
                  type="button"
                  onClick={() => copyLink(inv.invite_token)}
                  style={{ fontSize: 11, color: copied === inv.invite_token ? 'var(--sage)' : 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--fb)', padding: 0, transition: 'color .15s' }}
                >
                  {copied === inv.invite_token ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
