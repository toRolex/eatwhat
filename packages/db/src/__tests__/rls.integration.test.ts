import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEvent, deleteEvent, getEventById } from '../queries/events';
import {
  createServiceClient,
  createUserWithPassword,
  getTestEnv,
  randomSlug,
  signInAsUser,
} from './supabase-test-utils';

describe('Layer 2: RLS boundaries (live Supabase)', () => {
  const env = getTestEnv();
  const service = createServiceClient(env);

  const password = 'test-password-123!';
  const ownerEmail = `layer2-owner-${Date.now()}@example.com`;
  const otherEmail = `layer2-other-${Date.now()}@example.com`;

  let ownerId: string;
  let otherId: string;
  let ownerClient: Awaited<ReturnType<typeof signInAsUser>>;
  let otherClient: Awaited<ReturnType<typeof signInAsUser>>;
  let eventId: string | null = null;

  beforeAll(async () => {
    const owner = await createUserWithPassword(service, ownerEmail, password);
    const other = await createUserWithPassword(service, otherEmail, password);
    ownerId = owner.id;
    otherId = other.id;
    ownerClient = await signInAsUser(env, ownerEmail, password);
    otherClient = await signInAsUser(env, otherEmail, password);
  });

  afterAll(async () => {
    if (eventId) await deleteEvent(service, eventId);
    if (ownerId) await service.auth.admin.deleteUser(ownerId);
    if (otherId) await service.auth.admin.deleteUser(otherId);
  });

  it('non-owner cannot read another user event (should be null/404-like)', async () => {
    const slug = randomSlug('layer2-rls');
    const created = await createEvent(
      ownerClient,
      ownerId,
      {
        title: 'RLS Event',
        template_id: 'classic',
        date_flexible: true,
        location_hint: 'Test',
        rsvp_deadline: new Date(Date.now() + 60_000).toISOString(),
      } as any,
      slug,
    );
    expect(created.error).toBeNull();
    eventId = created.data!.id;

    const ownerRead = await getEventById(ownerClient, eventId);
    expect(ownerRead.error).toBeNull();
    expect(ownerRead.data?.id).toBe(eventId);

    const otherRead = await getEventById(otherClient, eventId);
    // With RLS, Supabase commonly returns { data: null, error: { code: 'PGRST116', ... } }
    // or a 404-like "no rows". We accept either pattern but require that data is null.
    expect(otherRead.data).toBeNull();
  });
});

