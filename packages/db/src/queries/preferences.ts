import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubmitPreferencesInput } from '@groupplan/types';

export async function getPreferencesByEvent(db: SupabaseClient, eventId: string) {
  return db
    .from('guest_preferences')
    .select('*')
    .eq('event_id', eventId);
}

export async function getPreferencesByInvitation(db: SupabaseClient, invitationId: string) {
  return db
    .from('guest_preferences')
    .select('*')
    .eq('invitation_id', invitationId)
    .maybeSingle();
}

export async function upsertPreferences(
  db: SupabaseClient,
  invitationId: string,
  eventId: string,
  input: SubmitPreferencesInput,
) {
  return db
    .from('guest_preferences')
    .upsert(
      { ...input, invitation_id: invitationId, event_id: eventId },
      { onConflict: 'invitation_id' },
    )
    .select()
    .single();
}
