import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export async function getVotesByEvent(db: SupabaseClient<Database>, eventId: string) {
  return db
    .from('votes')
    .select('*, proposals!inner(event_id)')
    .eq('proposals.event_id', eventId);
}

export async function getVotesByInvitation(db: SupabaseClient<Database>, invitationId: string) {
  return db
    .from('votes')
    .select('*')
    .eq('invitation_id', invitationId);
}

export async function upsertVote(
  db: SupabaseClient<Database>,
  proposalId: string,
  invitationId: string,
  rank: number,
) {
  return db
    .from('votes')
    .upsert(
      { proposal_id: proposalId, invitation_id: invitationId, rank },
      { onConflict: 'proposal_id,invitation_id' },
    )
    .select()
    .single();
}
