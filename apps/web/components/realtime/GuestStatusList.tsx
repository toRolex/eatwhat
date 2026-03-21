'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Invitation } from '@groupplan/types';

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-400',
  accepted: 'bg-green-500',
  declined: 'bg-red-400',
};

interface Props {
  eventId: string;
  initialInvitations: Invitation[];
}

export default function GuestStatusList({ eventId, initialInvitations }: Props) {
  const [invitations, setInvitations] = useState(initialInvitations);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to row-level changes on this event's invitations
    const channel = supabase
      .channel(`invitations:${eventId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'invitations',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInvitations((prev) => [...prev, payload.new as Invitation]);
          } else if (payload.eventType === 'UPDATE') {
            setInvitations((prev) =>
              prev.map((inv) => (inv.id === payload.new['id'] ? (payload.new as Invitation) : inv)),
            );
          } else if (payload.eventType === 'DELETE') {
            setInvitations((prev) => prev.filter((inv) => inv.id !== payload.old['id']));
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [eventId]);

  const accepted = invitations.filter((i) => i.status === 'accepted').length;
  const pending  = invitations.filter((i) => i.status === 'pending').length;
  const declined = invitations.filter((i) => i.status === 'declined').length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm text-zinc-500">
        <span><span className="font-semibold text-green-600">{accepted}</span> going</span>
        <span><span className="font-semibold text-amber-600">{pending}</span> pending</span>
        <span><span className="font-semibold text-red-500">{declined}</span> declined</span>
      </div>

      <ul className="space-y-2">
        {invitations.map((inv) => (
          <li key={inv.id} className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[inv.status] ?? 'bg-zinc-300'}`} />
            <span className="text-sm text-zinc-800">{inv.name}</span>
            <span className="text-xs text-zinc-400 capitalize ml-auto">{inv.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
