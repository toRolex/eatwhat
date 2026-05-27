const BASE = 'http://127.0.0.1:3000';
const SLUG = 'seed-inv-bob-dinner';

async function getStatus() {
  const r = await fetch(`${BASE}/api/invite/${SLUG}`, { cache: 'no-store' });
  const j = await r.json();
  return { http: r.status, status: j.invitation?.status, error: j.error };
}

async function resetPending() {
  const { createClient } = await import('@supabase/supabase-js');
  const fs = await import('fs');
  const path = await import('path');
  const envPath = path.resolve('../apps/web/.env.local');
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await db
    .from('invitations')
    .update({ status: 'pending', responded_at: null, user_id: null })
    .eq('slug', SLUG)
    .select('status')
    .single();
  return { ok: !error, error: error?.message, dbStatus: data?.status };
}

console.log('--- Persistence check: accept → GET ---\n');

const before = await getStatus();
console.log('Before accept:', before);

const reset = await resetPending();
console.log('Reset to pending:', reset);

const pre = await getStatus();
console.log('After reset (pre-accept):', pre);

const acceptRes = await fetch(`${BASE}/api/invite/${SLUG}/accept`, { method: 'POST' });
const acceptBody = await acceptRes.json().catch(() => ({}));
console.log('\nPOST /accept:', acceptRes.status, acceptBody);

const after = await getStatus();
console.log('GET immediately after:', after);

const pass =
  acceptRes.ok &&
  after.status === 'accepted' &&
  (pre.status === 'pending' || pre.status === 'accepted');
const fromPending = pre.status === 'pending';
console.log('\nResult:', {
  acceptHttp: acceptRes.status,
  getAfter: after.status,
  wasPendingBeforeAccept: fromPending,
});
console.log(
  '\n' +
    (after.status === 'accepted'
      ? 'PASS: GET after accept returns status "accepted"'
      : 'FAIL: expected accepted, got ' + (after.status ?? 'unknown')),
);
if (pre.status !== 'pending') {
  console.log('Note: could not confirm pending→accepted transition (pre-accept GET was ' + pre.status + ')');
}
