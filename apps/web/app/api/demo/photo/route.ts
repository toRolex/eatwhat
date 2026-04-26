import { NextResponse } from 'next/server';
import { ensureEnvLoaded } from '@/lib/env';

ensureEnvLoaded();

// Proxies Google Places photos so the API key stays server-side.
// Accepts ?legacy=<photo_reference> or ?new=<places/{id}/photos/{name}>
export async function GET(request: Request) {
  const url = new URL(request.url);
  const legacy = url.searchParams.get('legacy');
  const newRef = url.searchParams.get('new');

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: 'No key' }, { status: 503 });

  let upstream: string;
  if (legacy) {
    upstream = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${legacy}&key=${key}`;
  } else if (newRef) {
    upstream = `https://places.googleapis.com/v1/${newRef}/media?maxHeightPx=600&key=${key}`;
  } else {
    return NextResponse.json({ error: 'Provide ?legacy=... or ?new=...' }, { status: 400 });
  }

  const res = await fetch(upstream, { redirect: 'follow' });
  if (!res.ok) return NextResponse.json({ error: 'Photo not found' }, { status: res.status });

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type':  res.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
