// Templates are referenced by key; content lives in the adapter's template system
export type NotificationTemplate =
  | 'invitation-sent'
  | 'rsvp-reminder'
  | 'proposals-ready'
  | 'winner-announced';

export interface NotificationRecipient {
  name: string;
  email?: string;
  fcm_token?: string;
}

export interface NotificationPayload {
  to: NotificationRecipient;
  template: NotificationTemplate;
  // Template variables — keys depend on the template
  data: Record<string, string>;
}

// Implement this interface per channel (email, push, SMS)
export interface NotificationChannel {
  readonly name: string;
  // Return false if the payload lacks the data required by this channel
  canSend(payload: NotificationPayload): boolean;
  send(payload: NotificationPayload): Promise<void>;
}
