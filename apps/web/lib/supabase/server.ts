import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@groupplan/db';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

// Server component / Route Handler client — reads session from cookies
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll may throw in Server Components; the middleware handles refresh
          }
        },
      },
    },
  ) as unknown as SupabaseClient<Database>;
}

// Service role client for routes that operate on behalf of unauthenticated guests
export function createServiceClient(): SupabaseClient<Database> {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { persistSession: false },
    },
  ) as unknown as SupabaseClient<Database>;
}
