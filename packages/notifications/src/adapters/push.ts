import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { NotificationChannel, NotificationPayload } from '../interface';

const PUSH_TITLES: Record<string, string> = {
  'invitation-sent':   "You're invited!",
  'rsvp-reminder':    'Reminder: RSVP needed',
  'proposals-ready':  'Restaurant options are ready — vote now',
  'winner-announced': "It's decided! Here's where you're going",
};

export class PushNotificationChannel implements NotificationChannel {
  readonly name = 'push';
  private app: App;

  constructor(serviceAccountJson: Record<string, unknown>) {
    // Avoid re-initializing when hot-reloading in dev
    this.app =
      getApps().find((a) => a.name === 'groupplan-admin') ??
      initializeApp({ credential: cert(serviceAccountJson as never) }, 'groupplan-admin');
  }

  canSend(payload: NotificationPayload): boolean {
    return Boolean(payload.to.fcm_token);
  }

  async send(payload: NotificationPayload): Promise<void> {
    const title = PUSH_TITLES[payload.template] ?? 'GroupPlan';

    await getMessaging(this.app).send({
      token: payload.to.fcm_token!,
      notification: {
        title,
        body: payload.data['body'] ?? '',
      },
      data: payload.data,
    });
  }
}
