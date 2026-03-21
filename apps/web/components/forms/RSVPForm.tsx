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
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function respond(status: 'accepted' | 'declined') {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/invite/${token}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
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
      <p className="text-sm text-zinc-500">You declined this invitation.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={() => respond('accepted')}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        Accept
      </button>
      <button
        onClick={() => respond('declined')}
        disabled={loading}
        className="w-full py-3 rounded-xl border border-zinc-300 text-zinc-700 font-medium hover:bg-zinc-50 disabled:opacity-50 transition-colors"
      >
        Decline
      </button>
    </div>
  );
}
