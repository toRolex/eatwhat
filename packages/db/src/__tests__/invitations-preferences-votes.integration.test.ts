import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEvent, deleteEvent } from '../queries/events';
import { createInvitations, getInvitationsByEvent, updateInvitationStatus } from '../queries/invitations';
import { getPreferencesByEvent, upsertPreferences } from '../queries/preferences';
import { insertProposals } from '../queries/proposals';
import { getVotesByEvent, upsertVote } from '../queries/votes';
import {
  createServiceClient,
  createUserWithPassword,
  getTestEnv,
  randomSlug,
  signInAsUser,
} from './supabase-test-utils';

describe('Layer 2: invitations + preferences + votes (live Supabase)', () => {
  const env = getTestEnv();
  const service = createServiceClient(env);

  const password = 'test-password-123!';
  const email = `layer2-host2-${Date.now()}@example.com`;
  let hostId: string;
  let hostClient: Awaited<ReturnType<typeof signInAsUser>>;

  let eventId: string | null = null;
  let invitationToken: string | null = null;
  let invitationId: string | null = null;
  let proposalId: string | null = null;

  beforeAll(async () => {
    const host = await createUserWithPassword(service, email, password);
    hostId = host.id;
    hostClient = await signInAsUser(env, email, password);
  });

  afterAll(async () => {
    if (eventId) {
      await deleteEvent(service, eventId);
    }
    if (hostId) {
      await service.auth.admin.deleteUser(hostId);
    }
  });

  it('can create invitations and list by event', async () => {
    const slug = randomSlug('layer2-invite-event');
    const createdEvent = await createEvent(
      hostClient,
      hostId,
      {
        title: 'Layer2 Invite Event',
        template_id: 'classic',
        date_flexible: true,
        location_hint: 'Test',
        rsvp_deadline: new Date(Date.now() + 60_000).toISOString(),
      } as any,
      slug,
    );
    expect(createdEvent.error).toBeNull();
    eventId = createdEvent.data!.id;

    const createdInv = await createInvitations(hostClient, [
      { event_id: eventId, event_slug: slug, name: 'Guest 1', email: `guest1-${Date.now()}@example.com` },
    ]);
    expect(createdInv.error).toBeNull();
    expect(createdInv.data?.length).toBe(1);

    const inv = createdInv.data![0] as any;
    invitationId = inv.id;
    invitationToken = inv.invite_token;
    expect(inv.slug).toContain(`${slug}-`);

    const listed = await getInvitationsByEvent(hostClient, eventId);
    expect(listed.error).toBeNull();
    expect(listed.data?.length).toBeGreaterThanOrEqual(1);
  });

  it('can accept invitation, submit preferences, create proposals, and vote', async () => {
    expect(eventId).toBeTruthy();
    expect(invitationId).toBeTruthy();
    expect(invitationToken).toBeTruthy();

    const accepted = await updateInvitationStatus(hostClient, invitationToken!, 'accepted', 'Guest 1 Updated');
    expect(accepted.error).toBeNull();
    expect((accepted.data as any)?.status).toBe('accepted');

    const pref = await upsertPreferences(service, invitationId!, eventId!, {
      dietary: ['vegetarian'],
      cuisine_prefs: ['italian'],
      cuisine_avoid: [],
      budget_min: 2000,
      budget_max: 5000,
      location_pref: 'downtown',
      notes: 'No peanuts',
      availability: null,
      vibe_pref: 'cozy',
    } as any);
    expect(pref.error).toBeNull();

    const prefs = await getPreferencesByEvent(service, eventId!);
    expect(prefs.error).toBeNull();
    expect(prefs.data?.length).toBeGreaterThanOrEqual(1);

    const proposals = await insertProposals(service, [
      {
        event_id: eventId!,
        rank: 1,
        restaurant_name: 'Test Restaurant',
        restaurant_addr: '1 Main St',
        cuisine_type: 'Italian',
        price_range: '$$',
        reasoning: 'Looks good',
        constraints_met: { vegetarian: true },
        constraints_gap: {},
      },
    ]);
    expect(proposals.error).toBeNull();
    proposalId = (proposals.data![0] as any).id;

    const vote = await upsertVote(service, proposalId!, invitationId!, 1);
    expect(vote.error).toBeNull();

    const votes = await getVotesByEvent(service, eventId!);
    expect(votes.error).toBeNull();
    expect(votes.data?.length).toBeGreaterThanOrEqual(1);
  });
});

