import sgMail from '@sendgrid/mail';
import type { NotificationChannel, NotificationPayload } from '../interface';

// Template IDs are managed in the SendGrid dashboard
const SENDGRID_TEMPLATE_IDS: Record<string, string> = {
  'invitation-sent':   'd-invitation-sent-template-id',
  'rsvp-reminder':     'd-rsvp-reminder-template-id',
  'proposals-ready':   'd-proposals-ready-template-id',
  'winner-announced':  'd-winner-announced-template-id',
};

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
    const templateId = SENDGRID_TEMPLATE_IDS[payload.template];
    if (!templateId) {
      throw new Error(`No SendGrid template ID configured for: ${payload.template}`);
    }

    await sgMail.send({
      to:         { email: payload.to.email!, name: payload.to.name },
      from:       { email: this.fromEmail, name: this.fromName },
      templateId,
      dynamicTemplateData: payload.data,
    });
  }
}
