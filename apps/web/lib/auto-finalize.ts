import { createServiceClient } from '@/lib/supabase/server';
import { getProposalsByEvent, getVotesByEvent, getInvitationsByEvent } from '@groupplan/db';
import { getNotificationService, sendBatch, appUrl } from '@/lib/notifications';
import { computeBorda, DINNER_DURATION_MS } from '@/lib/scoring';

// Check-on-read auto-finalize: when an event in `deciding` has passed its
// vote_deadline, lock in the current Borda winner. Idempotent — safe to call
// from any read path. Returns true if it actually finalized.
export async function maybeAutoFinalize(eventId: string): Promise<boolean> {
  const db = createServiceClient();

  const { data: event } = await db
    .from('events')
    .select('id, title, status, vote_deadline, proposed_date')
    .eq('id', eventId)
    .single();

  if (!event) return false;
  if (event.status !== 'deciding') return false;
  if (!event.vote_deadline) return false;
  if (new Date(event.vote_deadline).getTime() > Date.now()) return false;

  const [{ data: proposals }, { data: votes }] = await Promise.all([
    getProposalsByEvent(db as never, eventId),
    getVotesByEvent(db as never, eventId),
  ]);

  if (!proposals?.length) return false;

  const { tally } = computeBorda(proposals.map((p) => p.id), votes ?? []);
  const scoreById = new Map(tally.map((t) => [t.proposal_id, t.weighted_score]));

  const winner = [...proposals].sort(
    (a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0),
  )[0];

  // No votes at all — leave it open rather than picking arbitrarily.
  if (!winner || (scoreById.get(winner.id) ?? 0) === 0) return false;

  // We need a confirmed_time. Prefer proposed_date; fall back to the proposal's
  // suggested_time; otherwise skip auto-finalize and let the host decide.
  const confirmedISO = event.proposed_date ?? winner.suggested_time ?? null;
  if (!confirmedISO) return false;

  const confirmedTime = new Date(confirmedISO);
  const endTime = new Date(confirmedTime.getTime() + DINNER_DURATION_MS);

  const { data: invitations } = await getInvitationsByEvent(db as never, eventId);
  const attendees = (invitations ?? [])
    .filter((i) => i.status === 'accepted')
    .map((i) => ({ name: i.name, email: i.email }));

  // Belt-and-suspenders against double-finalize from concurrent reads: only
  // flip status if it's still `deciding` when we write.
  const { data: flipped } = await db
    .from('events')
    .update({ status: 'finalized' })
    .eq('id', eventId)
    .eq('status', 'deciding')
    .select('id')
    .single();
  if (!flipped) return false;

  await db.from('finalized_plans').insert({
    event_id:       eventId,
    proposal_id:    winner.id,
    confirmed_time: confirmedTime.toISOString(),
    notes:          'Auto-finalized after vote deadline.',
    calendar_data: {
      title:       event.title,
      description: `GroupPlan dinner at ${winner.restaurant_name}`,
      location:    winner.restaurant_addr,
      start_time:  confirmedTime.toISOString(),
      end_time:    endTime.toISOString(),
      attendees,
    },
  });

  const notifier = getNotificationService();
  if (notifier) {
    const confirmedDisplay = confirmedTime.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
    const accepted = (invitations ?? []).filter((i) => i.status === 'accepted');
    await sendBatch(
      notifier,
      accepted.map((inv) => ({
        to:       { name: inv.name, email: inv.email },
        template: 'winner-announced' as const,
        data: {
          event_title:     event.title,
          restaurant_name: winner.restaurant_name,
          restaurant_addr: winner.restaurant_addr,
          confirmed_time:  confirmedDisplay,
          calendar_url:    `${appUrl()}/api/events/${eventId}/calendar`,
        },
      })),
      `auto-finalize event ${eventId}`,
    );
  }

  return true;
}
