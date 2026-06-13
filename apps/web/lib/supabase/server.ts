// Stub: Supabase server client disabled in SQLite mode.
// Server components now use '@/lib/db' instead.
export async function createClient() {
  throw new Error('Supabase server client is disabled. Use @/lib/db instead.');
}

export function createServiceClient() {
  throw new Error('Supabase service client is disabled. Use @/lib/db instead.');
}
