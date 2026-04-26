import { EmailNotificationChannel, NotificationService } from '@groupplan/notifications';
import type { NotificationPayload } from '@groupplan/notifications';
import { ensureEnvLoaded } from './env';

let cached: NotificationService | null = null;

// Returns null when SendGrid isn't configured — callers must no-op in that case.
export function getNotificationService(): NotificationService | null {
  ensureEnvLoaded();

  const apiKey    = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName  = process.env.SENDGRID_FROM_NAME ?? 'GroupPlan';

  if (!apiKey || !fromEmail) return null;

  if (!cached) {
    cached = new NotificationService([
      new EmailNotificationChannel(apiKey, fromEmail, fromName),
    ]);
  }
  return cached;
}

export interface EmailBatchResult {
  sent:    number;
  failed:  number;
  errors:  { email: string; message: string }[];
}

// Send a batch of notifications, log individual failures to the server console,
// and return a summary so callers can surface it to the host.
export async function sendBatch(
  notifier: NotificationService,
  messages: NotificationPayload[],
  context: string,
): Promise<EmailBatchResult> {
  const results = await Promise.allSettled(
    messages.map((payload) => notifier.notify(payload)),
  );

  const errors: { email: string; message: string }[] = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const email = messages[i]!.to.email ?? '(unknown)';
      const message = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.error(`[notifications] ${context} failed for ${email}: ${message}`);
      errors.push({ email, message });
    }
  });

  return { sent: results.length - errors.length, failed: errors.length, errors };
}

export function appUrl(): string {
  ensureEnvLoaded();
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}
