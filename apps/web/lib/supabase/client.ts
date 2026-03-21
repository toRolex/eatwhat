'use client';

import { createBrowserClient } from '@supabase/ssr';

// Singleton browser client — safe to call from any client component
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
