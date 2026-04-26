import { NextResponse } from 'next/server';
import { ensureEnvLoaded } from '@/lib/env';
import { verifyPhotoToken } from '@/lib/photo-signing';

ensureEnvLoaded();

// Proxies Google Places photos so the API key stays server-side.
// All requests must carry an HMAC-signed token to prevent the route from
// being used as an open relay against the host's Places quota.
//
// Accepts ?legacy=<signed-token>  → photo_reference based fetch
//      or ?new=<signed-token>     → places/{id}/photos/{name} based fetch
export async function GET(request: Request) {
  const url = new URL(request.url);
  const legacyToken = url.searchParams.get('legacy');
  const newToken    = url.searchParams.get('new');

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: 'No key' }, { status: 503 });

  const token = legacyToken ?? newToken;
  if (!token) {
    return NextResponse.json({ error: 'Provide ?legacy=... or ?new=...' }, { status: 400 });
  }

  const verified = verifyPhotoToken(token);
  if (!verified) {
    return NextResponse.json({ error: 'Invalid or expired photo token' }, { status: 403 });
  }

  let upstream: string;
  if (legacyToken) {
    upstream = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${encodeURIComponent(verified.ref)}&key=${key}`;
  } else {
    upstream = `https://places.googleapis.com/v1/${verified.ref}/media?maxHeightPx=600&key=${key}`;
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
