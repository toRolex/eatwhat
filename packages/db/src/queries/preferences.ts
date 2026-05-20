import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../database.types';
import type { SubmitPreferencesInput } from '@groupplan/types';

export async function getPreferencesByEvent(db: SupabaseClient<Database>, eventId: string) {
  return db
    .from('guest_preferences')
    .select('*')
    .eq('event_id', eventId);
}

export async function getPreferencesByInvitation(
  db: SupabaseClient<Database>,
  invitationId: string,
) {
  return db
    .from('guest_preferences')
    .select('*')
    .eq('invitation_id', invitationId)
    .maybeSingle();
}

export async function upsertPreferences(
  db: SupabaseClient<Database>,
  invitationId: string,
  eventId: string,
  input: SubmitPreferencesInput,
) {
  return db
    .from('guest_preferences')
    .upsert(
      { ...input, availability: input.availability as Json | undefined, invitation_id: invitationId, event_id: eventId },
      { onConflict: 'invitation_id' },
    )
    .select()
    .single();
}
