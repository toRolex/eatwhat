import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import type { CreateEventInput, UpdateEventInput } from '@groupplan/types';

export async function getEventBySlug(db: SupabaseClient<Database>, slug: string) {
  return db.from('events').select('*').eq('slug', slug).single();
}

export async function getEventById(db: SupabaseClient<Database>, id: string) {
  return db.from('events').select('*').eq('id', id).single();
}

export async function getEventsByHost(db: SupabaseClient<Database>, hostId: string) {
  return db
    .from('events')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
}

export async function createEvent(
  db: SupabaseClient<Database>,
  hostId: string,
  input: CreateEventInput,
  slug: string,
) {
  return db
    .from('events')
    .insert({ ...input, host_id: hostId, slug })
    .select()
    .single();
}

export async function updateEvent(db: SupabaseClient<Database>, id: string, input: UpdateEventInput) {
  return db.from('events').update(input).eq('id', id).select().single();
}

export async function updateEventStatus(
  db: SupabaseClient<Database>,
  id: string,
  status: Database['public']['Enums']['event_status'],
) {
  return db.from('events').update({ status }).eq('id', id).select().single();
}

export async function deleteEvent(db: SupabaseClient<Database>, id: string) {
  return db.from('events').delete().eq('id', id);
}
