export type { NotificationChannel, NotificationPayload, NotificationTemplate, NotificationRecipient } from './interface';
export { NotificationService } from './service';
export { EmailNotificationChannel } from './adapters/email';
export { PushNotificationChannel } from './adapters/push';
