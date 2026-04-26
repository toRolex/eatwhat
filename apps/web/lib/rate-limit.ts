// In-memory sliding-window rate limiter. Per-process — fine for the single-node
// demo deploy; swap for Upstash/Redis if we ever scale horizontally.

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
} {
  const now = Date.now();
  const cutoff = now - windowMs;
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => t > cutoff);

  if (b.hits.length >= limit) {
    const retryAfterSec = Math.ceil((b.hits[0]! + windowMs - now) / 1000);
    buckets.set(key, b);
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  b.hits.push(now);
  buckets.set(key, b);

  // Opportunistic cleanup so the map doesn't grow unbounded
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.hits.length === 0 || v.hits[v.hits.length - 1]! < cutoff) buckets.delete(k);
    }
  }

  return { ok: true, remaining: limit - b.hits.length, retryAfterSec: 0 };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
