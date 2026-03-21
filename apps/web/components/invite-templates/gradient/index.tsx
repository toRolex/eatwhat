import Image from 'next/image';
import Link from 'next/link';
import type { Invitation, Event } from '@groupplan/types';

interface Props {
  invitation: Invitation;
  event: Pick<Event, 'id' | 'title' | 'description' | 'cover_image_url' | 'proposed_date' | 'rsvp_deadline' | 'status' | 'slug'>;
}

// Colourful gradient wash — energetic, works for fun/casual group dinners
export default function GradientTemplate({ invitation, event }: Props) {
  const deadline = new Date(event.rsvp_deadline).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 space-y-6 border border-white/20">

          {event.cover_image_url && (
            <div className="relative w-full aspect-video overflow-hidden rounded-2xl">
              <Image src={event.cover_image_url} alt={event.title} fill className="object-cover" />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-white/60 text-xs uppercase tracking-widest">You're invited to</p>
            <h1 className="text-3xl font-bold text-white leading-tight">{event.title}</h1>
            {event.description && (
              <p className="text-white/80 text-sm leading-relaxed">{event.description}</p>
            )}
          </div>

          <div className="bg-white/10 rounded-xl px-4 py-3">
            <p className="text-white/60 text-xs">RSVP by</p>
            <p className="text-white font-semibold">{deadline}</p>
          </div>

          {event.status === 'open' || event.status === 'collecting' ? (
            <div className="flex gap-3">
              <Link
                href={`/invite/${invitation.invite_token}/rsvp`}
                className="flex-1 py-3 rounded-xl bg-white text-fuchsia-700 font-bold text-center text-sm hover:bg-white/90 transition-colors"
              >
                RSVP
              </Link>
              <Link
                href={`/e/${event.slug}`}
                className="flex-1 py-3 rounded-xl border border-white/40 text-white font-medium text-center text-sm hover:bg-white/10 transition-colors"
              >
                Guest list
              </Link>
            </div>
          ) : (
            <p className="text-white/60 text-sm text-center">RSVPs are closed.</p>
          )}
        </div>
      </div>
    </div>
  );
}
