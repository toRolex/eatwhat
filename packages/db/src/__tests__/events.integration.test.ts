import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEvent, deleteEvent, getEventById } from '../queries/events';
import { createServiceClient, createUserWithPassword, getTestEnv, randomSlug, signInAsUser } from './supabase-test-utils';

describe('Layer 2: events (live Supabase)', () => {
  const env = getTestEnv();
  const service = createServiceClient(env);

  const password = 'test-password-123!';
  const email = `layer2-host-${Date.now()}@example.com`;
  let hostId: string;
  let hostClient: Awaited<ReturnType<typeof signInAsUser>>;
  let eventId: string | null = null;

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

  it('createEvent + getEventById round-trip', async () => {
    const slug = randomSlug('layer2-event');
    const created = await createEvent(
      hostClient,
      hostId,
      {
        title: 'Layer2 Event',
        description: 'db integration test',
        template_id: 'classic',
        date_flexible: true,
        location_hint: 'Somewhere',
        rsvp_deadline: new Date(Date.now() + 60_000).toISOString(),
      } as any,
      slug,
    );

    expect(created.error).toBeNull();
    expect(created.data?.id).toBeTruthy();

    eventId = created.data!.id;

    const fetched = await getEventById(hostClient, eventId);
    expect(fetched.error).toBeNull();
    expect(fetched.data?.id).toBe(eventId);
    expect(fetched.data?.slug).toBe(slug);
    expect(fetched.data?.host_id).toBe(hostId);
  });
});

