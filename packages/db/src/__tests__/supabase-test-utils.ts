import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export type TestEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export function getTestEnv(): TestEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!serviceRoleKey) throw new Error('Missing env SUPABASE_SERVICE_ROLE_KEY');

  return { url, anonKey, serviceRoleKey };
}

export function createServiceClient(env = getTestEnv()): SupabaseClient<Database> {
  return createClient<Database>(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAnonClient(env = getTestEnv()): SupabaseClient<Database> {
  return createClient<Database>(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createUserWithPassword(
  service: SupabaseClient<Database>,
  email: string,
  password: string,
) {
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created.error) throw created.error;
  if (!created.data.user) throw new Error('No user returned from createUser');
  return created.data.user;
}

export async function signInAsUser(env: TestEnv, email: string, password: string) {
  const client = createAnonClient(env);
  const res = await client.auth.signInWithPassword({ email, password });
  if (res.error) throw res.error;
  return client;
}

export function randomSlug(prefix = 'evt') {
  const suffix = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${Date.now()}-${suffix}`;
}

