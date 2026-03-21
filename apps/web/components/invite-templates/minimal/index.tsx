import Image from 'next/image';
import Link from 'next/link';
import type { Invitation, Event } from '@groupplan/types';

interface Props {
  invitation: Invitation;
  event: Pick<Event, 'id' | 'title' | 'description' | 'cover_image_url' | 'proposed_date' | 'rsvp_deadline' | 'status' | 'slug'>;
}

// Clean white layout with a thin serif feel — works for casual or professional groups
export default function MinimalTemplate({ invitation, event }: Props) {
  const deadline = new Date(event.rsvp_deadline).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">

        {event.cover_image_url && (
          <div className="relative w-16 h-16 overflow-hidden rounded-xl mx-auto">
            <Image src={event.cover_image_url} alt={event.title} fill className="object-cover" />
          </div>
        )}

        <div className="text-center space-y-3">
          <p className="text-xs text-zinc-400 tracking-widest uppercase">Invitation</p>
          <h1 className="text-2xl font-semibold text-zinc-900">{event.title}</h1>
          {event.description && (
            <p className="text-sm text-zinc-500 leading-relaxed max-w-xs mx-auto">{event.description}</p>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-zinc-400">RSVP by {deadline}</p>
        </div>

        {event.status === 'open' || event.status === 'collecting' ? (
          <div className="space-y-2">
            <Link
              href={`/invite/${invitation.invite_token}/rsvp`}
              className="block w-full py-3 rounded-lg bg-zinc-900 text-white font-medium text-center text-sm hover:bg-zinc-700 transition-colors"
            >
              RSVP now
            </Link>
            <Link
              href={`/e/${event.slug}`}
              className="block w-full py-3 rounded-lg text-zinc-500 text-center text-sm hover:text-zinc-800 transition-colors"
            >
              View guest list
            </Link>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 text-center">RSVPs are closed.</p>
        )}
      </div>
    </div>
  );
}
