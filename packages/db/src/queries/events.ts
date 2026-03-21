import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateEventInput, UpdateEventInput } from '@groupplan/types';

export async function getEventBySlug(db: SupabaseClient, slug: string) {
  return db.from('events').select('*').eq('slug', slug).single();
}

export async function getEventById(db: SupabaseClient, id: string) {
  return db.from('events').select('*').eq('id', id).single();
}

export async function getEventsByHost(db: SupabaseClient, hostId: string) {
  return db
    .from('events')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
}

export async function createEvent(
  db: SupabaseClient,
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

export async function updateEvent(db: SupabaseClient, id: string, input: UpdateEventInput) {
  return db.from('events').update(input).eq('id', id).select().single();
}

export async function updateEventStatus(db: SupabaseClient, id: string, status: string) {
  return db.from('events').update({ status }).eq('id', id).select().single();
}

export async function deleteEvent(db: SupabaseClient, id: string) {
  return db.from('events').delete().eq('id', id);
}
