import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

function randomHex8(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function getInvitationByToken(db: SupabaseClient<Database>, token: string) {
  return db.from('invitations').select('*').eq('invite_token', token).single();
}

export async function getInvitationBySlug(db: SupabaseClient<Database>, slug: string) {
  return db.from('invitations').select('*').eq('slug', slug).single();
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
  invitations: Array<{ event_id: string; event_slug: string; name: string; email: string }>,
) {
  const rows = invitations.map(({ event_slug, ...invitation }) => ({
    ...invitation,
    slug: `${event_slug}-${randomHex8()}`,
  }));

  return db.from('invitations').insert(rows).select();
}

export async function updateInvitationStatus(
  db: SupabaseClient<Database>,
  token: string,
  status: 'accepted' | 'declined',
  name?: string,
) {
  const payload: Database['public']['Tables']['invitations']['Update'] = {
    status,
    responded_at: new Date().toISOString(),
    ...(name !== undefined ? { name } : {}),
  };

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
