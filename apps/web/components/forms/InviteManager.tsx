'use client';

import { useState } from 'react';
import type { Invitation } from '@groupplan/types';

const STATUS_COLORS: Record<string, string> = {
  pending:  'text-amber-600 bg-amber-50',
  accepted: 'text-green-600 bg-green-50',
  declined: 'text-red-600 bg-red-50',
};

interface Props {
  eventId: string;
  initialInvitations: Invitation[];
}

export default function InviteManager({ eventId, initialInvitations }: Props) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className="space-y-8">
      <form onSubmit={addGuest} className="flex gap-3 items-end">
        <div className="flex-1 space-y-1">
          <label className="block text-xs font-medium text-zinc-600">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="block text-xs font-medium text-zinc-600">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com"
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '…' : 'Add'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {invitations.length === 0 ? (
        <p className="text-sm text-zinc-400">No guests yet — add someone above.</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {invitations.map((inv) => (
            <li key={inv.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-900">{inv.name}</p>
                <p className="text-xs text-zinc-500">{inv.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[inv.status] ?? ''}`}
                >
                  {inv.status}
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(`${appUrl}/invite/${inv.invite_token}`)}
                  className="text-xs text-zinc-400 hover:text-zinc-700"
                >
                  Copy link
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
