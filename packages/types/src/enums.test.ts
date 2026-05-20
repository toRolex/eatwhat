import { describe, it, expect } from 'vitest';
import { EventStatus, EVENT_STATUS_TRANSITIONS } from './enums';

describe('EVENT_STATUS_TRANSITIONS', () => {
  it('covers every EventStatus key', () => {
    const statuses = Object.values(EventStatus);
    for (const s of statuses) {
      expect(EVENT_STATUS_TRANSITIONS).toHaveProperty(s);
    }
  });

  it('draft can transition to open or cancelled', () => {
    expect(EVENT_STATUS_TRANSITIONS.draft).toContain('open');
    expect(EVENT_STATUS_TRANSITIONS.draft).toContain('cancelled');
    expect(EVENT_STATUS_TRANSITIONS.draft).toHaveLength(2);
  });

  it('open can transition to collecting or cancelled', () => {
    expect(EVENT_STATUS_TRANSITIONS.open).toContain('collecting');
    expect(EVENT_STATUS_TRANSITIONS.open).toContain('cancelled');
  });

  it('collecting can transition to deciding or cancelled', () => {
    expect(EVENT_STATUS_TRANSITIONS.collecting).toContain('deciding');
    expect(EVENT_STATUS_TRANSITIONS.collecting).toContain('cancelled');
  });

  it('deciding can transition to finalized or cancelled', () => {
    expect(EVENT_STATUS_TRANSITIONS.deciding).toContain('finalized');
    expect(EVENT_STATUS_TRANSITIONS.deciding).toContain('cancelled');
  });

  it('finalized is a terminal state with no transitions', () => {
    expect(EVENT_STATUS_TRANSITIONS.finalized).toHaveLength(0);
  });

  it('cancelled is a terminal state with no transitions', () => {
    expect(EVENT_STATUS_TRANSITIONS.cancelled).toHaveLength(0);
  });

  it('draft cannot skip directly to deciding or finalized', () => {
    expect(EVENT_STATUS_TRANSITIONS.draft).not.toContain('deciding');
    expect(EVENT_STATUS_TRANSITIONS.draft).not.toContain('finalized');
  });

  it('all transition targets are valid EventStatus values', () => {
    const validStatuses = new Set(Object.values(EventStatus));
    for (const targets of Object.values(EVENT_STATUS_TRANSITIONS)) {
      for (const target of targets) {
        expect(validStatuses.has(target)).toBe(true);
      }
    }
  });
});
