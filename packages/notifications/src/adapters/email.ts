import sgMail from '@sendgrid/mail';
import type { NotificationChannel, NotificationPayload } from '../interface';
import { renderEmail } from '../templates/email-renderer';

export class EmailNotificationChannel implements NotificationChannel {
  readonly name = 'email';

  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
    private readonly fromName: string,
  ) {
    sgMail.setApiKey(apiKey);
  }

  canSend(payload: NotificationPayload): boolean {
    return Boolean(payload.to.email);
  }

  async send(payload: NotificationPayload): Promise<void> {
    const { subject, html, text } = renderEmail(payload.template, payload.data);

    await sgMail.send({
      to:      { email: payload.to.email!, name: payload.to.name },
      from:    { email: this.fromEmail, name: this.fromName },
      subject,
      html,
      text,
    });
  }
}
