import { createServiceClient } from '@/lib/supabase/server';
import { trackFunnelEvent } from '@groupplan/db';

export async function track(
  eventName: string,
  opts: { userId?: string | null; sessionId?: string | null; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    const db = createServiceClient();
    await trackFunnelEvent(db, {
      event_name: eventName,
      user_id: opts.userId ?? null,
      session_id: opts.sessionId ?? null,
      metadata: opts.metadata,
    });
  } catch {
    // intentionally swallowed — tracking must never break a request
  }
}
