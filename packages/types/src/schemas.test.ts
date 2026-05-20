import { describe, it, expect } from 'vitest';
import {
  MagicLinkSchema,
  CreateEventSchema,
  SubmitPreferencesSchema,
  CastVoteSchema,
} from './schemas';

describe('MagicLinkSchema', () => {
  it('accepts a valid email', () => {
    expect(MagicLinkSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejects a non-email string', () => {
    expect(MagicLinkSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects an empty email', () => {
    expect(MagicLinkSchema.safeParse({ email: '' }).success).toBe(false);
  });

  it('rejects missing email field', () => {
    expect(MagicLinkSchema.safeParse({}).success).toBe(false);
  });
});

describe('CreateEventSchema', () => {
  const valid = {
    title: 'Friday Dinner',
    template_id: 'classic',
    date_flexible: true,
    rsvp_deadline: new Date(Date.now() + 86400000).toISOString(),
  };

  it('accepts a valid event', () => {
    expect(CreateEventSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(CreateEventSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
  });

  it('rejects a title over 120 characters', () => {
    expect(CreateEventSchema.safeParse({ ...valid, title: 'a'.repeat(121) }).success).toBe(false);
  });

  it('rejects an unknown template_id', () => {
    expect(CreateEventSchema.safeParse({ ...valid, template_id: 'neon' }).success).toBe(false);
  });

  it('accepts all valid template IDs', () => {
    for (const id of ['classic', 'minimal', 'gradient']) {
      expect(CreateEventSchema.safeParse({ ...valid, template_id: id }).success).toBe(true);
    }
  });
});

describe('SubmitPreferencesSchema', () => {
  const valid = {
    dietary: [],
    cuisine_prefs: [],
    cuisine_avoid: [],
  };

  it('accepts preferences with no budget set', () => {
    expect(SubmitPreferencesSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a valid budget range', () => {
    expect(SubmitPreferencesSchema.safeParse({
      ...valid,
      budget_min: 2000,
      budget_max: 5000,
    }).success).toBe(true);
  });

  it('accepts equal budget_min and budget_max', () => {
    expect(SubmitPreferencesSchema.safeParse({
      ...valid,
      budget_min: 3000,
      budget_max: 3000,
    }).success).toBe(true);
  });

  it('rejects budget_min greater than budget_max', () => {
    const result = SubmitPreferencesSchema.safeParse({
      ...valid,
      budget_min: 5000,
      budget_max: 2000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative budget values', () => {
    expect(SubmitPreferencesSchema.safeParse({
      ...valid,
      budget_min: -1,
    }).success).toBe(false);
  });

  it('rejects budget values over 100000 cents', () => {
    expect(SubmitPreferencesSchema.safeParse({
      ...valid,
      budget_max: 100_001,
    }).success).toBe(false);
  });

  it('rejects dietary array with items over 50 chars', () => {
    expect(SubmitPreferencesSchema.safeParse({
      ...valid,
      dietary: ['a'.repeat(51)],
    }).success).toBe(false);
  });

  it('rejects dietary array with more than 20 items', () => {
    expect(SubmitPreferencesSchema.safeParse({
      ...valid,
      dietary: Array(21).fill('vegan'),
    }).success).toBe(false);
  });
});

describe('CastVoteSchema', () => {
  it('accepts rank 1', () => {
    expect(CastVoteSchema.safeParse({ rank: 1 }).success).toBe(true);
  });

  it('accepts rank 2', () => {
    expect(CastVoteSchema.safeParse({ rank: 2 }).success).toBe(true);
  });

  it('accepts rank 3', () => {
    expect(CastVoteSchema.safeParse({ rank: 3 }).success).toBe(true);
  });

  it('rejects rank 0', () => {
    expect(CastVoteSchema.safeParse({ rank: 0 }).success).toBe(false);
  });

  it('rejects rank 4', () => {
    expect(CastVoteSchema.safeParse({ rank: 4 }).success).toBe(false);
  });

  it('rejects a non-integer rank', () => {
    expect(CastVoteSchema.safeParse({ rank: 1.5 }).success).toBe(false);
  });

  it('rejects a string rank', () => {
    expect(CastVoteSchema.safeParse({ rank: '1' }).success).toBe(false);
  });

  it('rejects missing rank', () => {
    expect(CastVoteSchema.safeParse({}).success).toBe(false);
  });
});
