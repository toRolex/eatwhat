import { type EmailTemplate, sendEmail } from './email';
import { ensureEnvLoaded } from './env';

export interface EmailPayload {
  to: { name: string; email?: string };
  template: EmailTemplate;
  data: Record<string, string>;
}

export interface EmailBatchResult {
  sent: number;
  failed: number;
  errors: { email: string; message: string }[];
}

type NotificationService = { notify(payload: EmailPayload): Promise<void> };

let cached:
  | {
      key: string;
      service: NotificationService;
    }
  | null = null;

export function getNotificationService(): NotificationService | null {
  ensureEnvLoaded();

  const apiKey    = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName  = process.env.SENDGRID_FROM_NAME ?? 'GroupPlan';

  if (!apiKey || !fromEmail) return null;

  const cacheKey = JSON.stringify([apiKey, fromEmail, fromName]);

  if (cached?.key === cacheKey) return cached.service;

  const service: NotificationService = {
    async notify(payload: EmailPayload): Promise<void> {
      if (!payload.to.email) return;

      await sendEmail(
        apiKey,
        fromEmail,
        fromName,
        { name: payload.to.name, email: payload.to.email },
        payload.template,
        payload.data,
      );
    },
  };

  cached = { key: cacheKey, service };
  return service;
}

export async function sendBatch(
  notifier: NotificationService,
  messages: EmailPayload[],
  context: string,
): Promise<EmailBatchResult> {
  const results = await Promise.allSettled(
    messages.map((payload) => notifier.notify(payload)),
  );

  const errors: { email: string; message: string }[] = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const messagePayload = messages[i];
      const email = messagePayload?.to.email ?? '(unknown)';
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
