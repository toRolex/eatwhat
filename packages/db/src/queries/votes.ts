import type { SupabaseClient } from '@supabase/supabase-js';

export async function getVotesByEvent(db: SupabaseClient, eventId: string) {
  return db
    .from('votes')
    .select('*, proposals!inner(event_id)')
    .eq('proposals.event_id', eventId);
}

export async function upsertVote(
  db: SupabaseClient,
  proposalId: string,
  invitationId: string,
  rank: 1 | 2 | 3,
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
