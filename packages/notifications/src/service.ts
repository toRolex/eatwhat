import type { NotificationChannel, NotificationPayload } from './interface';

export class NotificationService {
  private channels: NotificationChannel[];

  constructor(channels: NotificationChannel[]) {
    this.channels = channels;
  }

  async notify(payload: NotificationPayload): Promise<void> {
    const eligible = this.channels.filter((ch) => ch.canSend(payload));
    await Promise.all(eligible.map((ch) => ch.send(payload)));
  }

  async notifyMany(payloads: NotificationPayload[]): Promise<void> {
    await Promise.all(payloads.map((p) => this.notify(p)));
  }
}
