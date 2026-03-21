import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEventById, getProposalsByEvent } from '@groupplan/db';

export const metadata: Metadata = { title: 'Results' };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: event } = await getEventById(supabase as never, id);

  if (!event) notFound();
  if (event.status !== 'deciding' && event.status !== 'finalized') notFound();

  const { data: proposals } = await getProposalsByEvent(supabase as never, id);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">
        {event.status === 'finalized' ? 'Final result' : 'Voting in progress'}
      </h1>
      <ul className="space-y-4">
        {(proposals ?? []).map((p) => (
          <li key={p.id} className="p-4 rounded-xl border border-zinc-200 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">#{p.rank}</span>
              <span className="font-semibold text-zinc-900">{p.restaurant_name}</span>
              <span className="text-sm text-zinc-500">{p.cuisine_type}</span>
              <span className="text-sm text-zinc-400">{p.price_range}</span>
            </div>
            <p className="text-sm text-zinc-600">{p.reasoning}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
