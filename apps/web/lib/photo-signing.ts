import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { ensureEnvLoaded } from './env';

// HMAC-signs photo references so the proxy can't be used as an open relay
// against the host's billable Google Places quota.
//
// A signed token has the form: <ref>.<expiry>.<sig>
// where sig = HMAC-SHA256(secret, `${ref}.${expiry}`) truncated to 16 bytes.

const TTL_MS = 24 * 60 * 60 * 1000; // 24h — matches the Cache-Control on the proxy

function getSecret(): Buffer {
  ensureEnvLoaded();
  const fromEnv = process.env.PHOTO_PROXY_SECRET;
  if (fromEnv && fromEnv.length >= 16) return Buffer.from(fromEnv, 'utf-8');

  // Fallback: derive from any other server-only secret so dev works without setup.
  // Production should set PHOTO_PROXY_SECRET explicitly.
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
                ?? process.env.ANTHROPIC_API_KEY
                ?? randomBytes(32).toString('hex');
  return Buffer.from('groupplan-photo-v1:' + fallback, 'utf-8');
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex').slice(0, 32);
}

export function signPhotoRef(ref: string): string {
  const expiry = Date.now() + TTL_MS;
  const payload = `${ref}.${expiry}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyPhotoToken(token: string): { ref: string } | null {
  const lastDot = token.lastIndexOf('.');
  if (lastDot <= 0) return null;

  const payload = token.slice(0, lastDot);
  const sig     = token.slice(lastDot + 1);

  const expectedSig = sign(payload);
  if (sig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

  const expiryDot = payload.lastIndexOf('.');
  if (expiryDot <= 0) return null;

  const ref    = payload.slice(0, expiryDot);
  const expiry = Number(payload.slice(expiryDot + 1));
  if (!Number.isFinite(expiry) || Date.now() > expiry) return null;

  return { ref };
}
