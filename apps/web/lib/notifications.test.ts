import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./env', () => ({ ensureEnvLoaded: vi.fn() }));

import { getNotificationService, sendBatch, appUrl } from './notifications';
import { sendEmail } from './email';
import type { EmailPayload } from './notifications';

describe('getNotificationService', () => {
  beforeEach(() => {
    process.env.SENDGRID_API_KEY = 'key123';
    process.env.SENDGRID_FROM_EMAIL = 'from@example.com';
    delete process.env.SENDGRID_FROM_NAME;
  });

  afterEach(() => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;
    delete process.env.SENDGRID_FROM_NAME;
    vi.clearAllMocks();
  });

  it('returns null when SENDGRID_API_KEY is not set', () => {
    delete process.env.SENDGRID_API_KEY;

    expect(getNotificationService()).toBeNull();
  });

  it('returns null when SENDGRID_FROM_EMAIL is not set', () => {
    delete process.env.SENDGRID_FROM_EMAIL;

    expect(getNotificationService()).toBeNull();
  });

  it('returns a notifier when both env vars are set', () => {
    expect(getNotificationService()).not.toBeNull();
  });

  it('returns the same instance on repeated calls with same env', () => {
    const first = getNotificationService();
    const second = getNotificationService();

    expect(first).toBe(second);
  });

  it('notifier.notify() calls sendEmail with correct args', async () => {
    const notifier = getNotificationService();

    await notifier?.notify({
      to: { name: 'Alice', email: 'alice@test.com' },
      template: 'invitation-sent',
      data: { host_name: 'Bob', event_title: 'Dinner', invite_url: 'https://x.com' },
    });

    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(
      'key123',
      'from@example.com',
      'GroupPlan',
      { name: 'Alice', email: 'alice@test.com' },
      'invitation-sent',
      { host_name: 'Bob', event_title: 'Dinner', invite_url: 'https://x.com' },
    );
  });

  it('notifier.notify() is a no-op when payload.to.email is undefined', async () => {
    const notifier = getNotificationService();

    await notifier?.notify({
      to: { name: 'Alice', email: undefined },
      template: 'invitation-sent',
      data: { host_name: 'Bob', event_title: 'Dinner', invite_url: 'https://x.com' },
    });

    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });
});

describe('sendBatch', () => {
  const alice: EmailPayload = {
    to: { name: 'Alice', email: 'alice@example.com' },
    template: 'invitation-sent',
    data: {},
  };
  const bob: EmailPayload = {
    to: { name: 'Bob', email: 'bob@example.com' },
    template: 'invitation-sent',
    data: {},
  };

  it('returns sent:2, failed:0, errors:[] when both succeed', async () => {
    const notifier = { notify: vi.fn().mockResolvedValue(undefined) };

    const result = await sendBatch(notifier, [alice, bob], 'test');

    expect(result).toEqual({ sent: 2, failed: 0, errors: [] });
  });

  it('returns sent:1, failed:1 with error details when second throws Error("boom")', async () => {
    const notifier = {
      notify: vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('boom')),
    };

    const result = await sendBatch(notifier, [alice, bob], 'test');

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual([{ email: 'bob@example.com', message: 'boom' }]);
  });

  it('handles non-Error thrown value (string)', async () => {
    const notifier = {
      notify: vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce('oops'),
    };

    const result = await sendBatch(notifier, [alice, bob], 'test');

    expect(result.errors[0]?.message).toBe('oops');
  });

  it('calls console.error for failed sends', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const notifier = {
      notify: vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('boom')),
    };

    await sendBatch(notifier, [alice, bob], 'test');

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('appUrl', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('returns NEXT_PUBLIC_APP_URL when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';

    expect(appUrl()).toBe('https://app.example.com');
  });

  it('returns localhost fallback when not set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(appUrl()).toBe('http://localhost:3000');
  });
});
