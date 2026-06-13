'use client';

// Stub: Supabase client disabled in SQLite mode.
// The demo page imports this but we no longer have Supabase.
// Return a mock that doesn't crash — the demo page already has graceful fallbacks.
export function createClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        then: async () => ({ data: [], error: null }),
        eq: () => ({
          then: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  } as unknown as ReturnType<typeof createClient>;
}
