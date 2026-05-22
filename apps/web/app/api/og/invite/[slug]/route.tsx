import { ImageResponse } from 'next/og';
import { createServiceClient } from '@/lib/supabase/server';
import { getEventById, getInvitationBySlug } from '@groupplan/db';

interface Context {
  params: Promise<{ slug: string }>;
}

const CATEGORY_BG: Record<string, string> = {
  dinner: '#FFF7ED',
  activity: '#EFF6FF',
  movie: '#F5F3FF',
};

function formatDate(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? '?'}${parts[1]?.[0] ?? ''}`;
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const db = createServiceClient();
  const { data: invitation } = await getInvitationBySlug(db, slug);

  if (!invitation) {
    return new Response('Not found', { status: 404 });
  }

  const { data: event } = await getEventById(db, invitation.event_id);

  if (!event) {
    return new Response('Not found', { status: 404 });
  }

  const { data: host } = await db
    .from('users')
    .select('name, email, avatar_url')
    .eq('id', event.host_id)
    .single();

  const hostName = host?.name ?? host?.email?.split('@')[0] ?? 'Your host';
  const background = CATEGORY_BG[event.category] ?? CATEGORY_BG.dinner;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background,
          color: '#171717',
          padding: 72,
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>GroupPlan</div>
          <div style={{ fontSize: 26, color: '#57534E' }}>{formatDate(event.proposed_date)}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 34, color: '#57534E' }}>You&apos;re invited to</div>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -4, lineHeight: 0.95, maxWidth: 900 }}>
            {event.title}
          </div>
          {event.location_hint && (
            <div style={{ fontSize: 32, color: '#44403C' }}>{event.location_hint}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              background: '#171717',
              color: background,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              fontWeight: 800,
              overflow: 'hidden',
            }}
          >
            {host?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={host.avatar_url} alt="" width="88" height="88" style={{ objectFit: 'cover' }} />
            ) : (
              initials(hostName)
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 24, color: '#57534E' }}>Hosted by</div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>{hostName}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
