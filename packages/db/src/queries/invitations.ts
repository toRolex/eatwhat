import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export async function getInvitationByToken(db: SupabaseClient<Database>, token: string) {
  return db.from('invitations').select('*').eq('invite_token', token).single();
}

export async function getInvitationsByEvent(db: SupabaseClient<Database>, eventId: string) {
  return db
    .from('invitations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
}

export async function createInvitations(
  db: SupabaseClient<Database>,
  invitations: Array<{ event_id: string; name: string; email: string }>,
) {
  return db.from('invitations').insert(invitations).select();
}

export async function updateInvitationStatus(
  db: SupabaseClient<Database>,
  token: string,
  status: 'accepted' | 'declined',
  name?: string,
) {
  const payload: Record<string, unknown> = {
    status,
    responded_at: new Date().toISOString(),
  };
  if (name) payload['name'] = name;

  return db
    .from('invitations')
    .update(payload)
    .eq('invite_token', token)
    .select()
    .single();
}

export async function linkInvitationToUser(
  db: SupabaseClient<Database>,
  invitationId: string,
  userId: string,
) {
  return db
    .from('invitations')
    .update({ user_id: userId })
    .eq('id', invitationId)
    .select()
    .single();
}
