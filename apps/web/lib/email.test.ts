import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sendgrid/mail', () => ({
  default: { setApiKey: vi.fn(), send: vi.fn().mockResolvedValue([{ statusCode: 202 }, {}]) },
}));

import sgMail from '@sendgrid/mail';
import { renderEmail, sendEmail } from './email';

describe('renderEmail', () => {
  it('invitation-sent subject contains host_name and event_title', () => {
    const result = renderEmail('invitation-sent', {
      host_name: 'Bob',
      event_title: 'Dinner',
      invite_url: 'https://example.com/invite',
    });

    expect(result.subject).toContain('Bob');
    expect(result.subject).toContain('Dinner');
  });

  it('invitation-sent text contains invite_url', () => {
    const result = renderEmail('invitation-sent', {
      host_name: 'Bob',
      event_title: 'Dinner',
      invite_url: 'https://example.com/invite',
    });

    expect(result.text).toContain('https://example.com/invite');
  });

  it("invitation-sent html contains '&lt;script&gt;' when host_name is '<script>' and does NOT contain '<script>' literally", () => {
    const result = renderEmail('invitation-sent', {
      host_name: '<script>',
      event_title: 'Dinner',
      invite_url: 'https://example.com/invite',
    });

    expect(result.html).toContain('&lt;script&gt;');
    expect(result.html).not.toContain('<script>');
  });

  it("rsvp-reminder subject starts with 'Reminder:' and contains event_title", () => {
    const result = renderEmail('rsvp-reminder', {
      event_title: 'Dinner',
      invite_url: 'https://example.com/invite',
      deadline: 'Friday',
    });

    expect(result.subject.startsWith('Reminder:')).toBe(true);
    expect(result.subject).toContain('Dinner');
  });

  it('rsvp-reminder text contains deadline and invite_url', () => {
    const result = renderEmail('rsvp-reminder', {
      event_title: 'Dinner',
      invite_url: 'https://example.com/invite',
      deadline: 'Friday',
    });

    expect(result.text).toContain('Friday');
    expect(result.text).toContain('https://example.com/invite');
  });

  it('proposals-ready subject contains event_title', () => {
    const result = renderEmail('proposals-ready', {
      event_title: 'Dinner',
      vote_url: 'https://example.com/vote',
    });

    expect(result.subject).toContain('Dinner');
  });

  it('proposals-ready text contains vote_url', () => {
    const result = renderEmail('proposals-ready', {
      event_title: 'Dinner',
      vote_url: 'https://example.com/vote',
    });

    expect(result.text).toContain('https://example.com/vote');
  });

  it('winner-announced subject contains restaurant_name', () => {
    const result = renderEmail('winner-announced', {
      event_title: 'Dinner',
      restaurant_name: 'Sushi Spot',
      restaurant_addr: '1 Main St',
      confirmed_time: 'Friday',
    });

    expect(result.subject).toContain('Sushi Spot');
  });

  it('winner-announced text contains restaurant_addr and event_title', () => {
    const result = renderEmail('winner-announced', {
      event_title: 'Dinner',
      restaurant_name: 'Sushi Spot',
      restaurant_addr: '1 Main St',
      confirmed_time: 'Friday',
    });

    expect(result.text).toContain('1 Main St');
    expect(result.text).toContain('Dinner');
  });

  it("winner-announced html does NOT contain 'Add to calendar' when calendar_url is absent", () => {
    const result = renderEmail('winner-announced', {
      event_title: 'Dinner',
      restaurant_name: 'Sushi Spot',
      restaurant_addr: '1 Main St',
      confirmed_time: 'Friday',
    });

    expect(result.html).not.toContain('Add to calendar');
  });

  it("winner-announced html DOES contain 'Add to calendar' when calendar_url is provided", () => {
    const result = renderEmail('winner-announced', {
      event_title: 'Dinner',
      restaurant_name: 'Sushi Spot',
      restaurant_addr: '1 Main St',
      confirmed_time: 'Friday',
      calendar_url: 'https://example.com/calendar',
    });

    expect(result.html).toContain('Add to calendar');
  });
});

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls sgMail.setApiKey with the apiKey argument', async () => {
    await sendEmail(
      'test-key',
      'from@example.com',
      'GroupPlan',
      { name: 'Alice', email: 'alice@example.com' },
      'invitation-sent',
      { host_name: 'Bob', event_title: 'Dinner', invite_url: 'https://example.com/invite' },
    );

    expect(vi.mocked(sgMail).setApiKey).toHaveBeenCalledWith('test-key');
  });

  it('calls sgMail.send with correct to, from ({email, name}), subject, html, text', async () => {
    await sendEmail(
      'test-key',
      'from@example.com',
      'GroupPlan',
      { name: 'Alice', email: 'alice@example.com' },
      'invitation-sent',
      { host_name: 'Bob', event_title: 'Dinner', invite_url: 'https://example.com/invite' },
    );

    expect(vi.mocked(sgMail).send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { name: 'Alice', email: 'alice@example.com' },
        from: { email: 'from@example.com', name: 'GroupPlan' },
        subject: expect.stringContaining('Bob'),
        html: expect.stringMatching(/[\s\S]+/),
        text: expect.stringMatching(/[\s\S]+/),
      }),
    );
  });

  it('rejects when sgMail.send rejects', async () => {
    vi.mocked(sgMail).send.mockRejectedValueOnce(new Error('SendGrid down'));

    await expect(sendEmail(
      'test-key',
      'from@example.com',
      'GroupPlan',
      { name: 'Alice', email: 'alice@example.com' },
      'invitation-sent',
      { host_name: 'Bob', event_title: 'Dinner', invite_url: 'https://example.com/invite' },
    )).rejects.toThrow('SendGrid down');
  });
});
