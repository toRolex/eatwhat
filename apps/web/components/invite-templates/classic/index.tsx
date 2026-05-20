import Image from 'next/image';
import Link from 'next/link';
import type { Invitation, Event } from '@groupplan/types';

interface Props {
  invitation: Invitation;
  event: Pick<Event, 'id' | 'title' | 'description' | 'cover_image_url' | 'proposed_date' | 'rsvp_deadline' | 'status' | 'slug'>;
}

// Dark, editorial card — works well for upscale/formal dinners
export default function ClassicTemplate({ invitation, event }: Props) {
  const deadline = new Date(event.rsvp_deadline).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-0">

        {event.cover_image_url && (
          <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl">
            <Image src={event.cover_image_url} alt={event.title} fill className="object-cover" />
          </div>
        )}

        <div className={`bg-zinc-900 p-8 space-y-6 ${event.cover_image_url ? 'rounded-b-2xl' : 'rounded-2xl'}`}>
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">You&apos;re invited</p>
            <h1 className="text-3xl font-bold text-white leading-tight">{event.title}</h1>
            {event.description && (
              <p className="text-zinc-400 text-sm leading-relaxed">{event.description}</p>
            )}
          </div>

          <div className="border-t border-zinc-800 pt-6 space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">RSVP by</p>
            <p className="text-white font-medium">{deadline}</p>
          </div>

          {event.status === 'open' || event.status === 'collecting' ? (
            <div className="flex gap-3">
              <Link
                href={`/invite/${invitation.invite_token}/rsvp`}
                className="flex-1 py-3 rounded-xl bg-white text-zinc-900 font-semibold text-center text-sm hover:bg-zinc-100 transition-colors"
              >
                RSVP
              </Link>
              <Link
                href={`/e/${event.slug}`}
                className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium text-center text-sm hover:border-zinc-500 transition-colors"
              >
                See who&apos;s coming
              </Link>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 italic">RSVPs are closed.</p>
          )}
        </div>
      </div>
    </div>
  );
}
