import { trackFunnelEvent } from '@/lib/db';

export async function track(
  eventName: string,
  opts: { userId?: string | null; sessionId?: string | null; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    trackFunnelEvent({
      event_name: eventName,
      user_id: opts.userId ?? null,
      session_id: opts.sessionId ?? null,
      metadata: opts.metadata,
    });
  } catch {
    // intentionally swallowed — tracking must never break a request
  }
}
