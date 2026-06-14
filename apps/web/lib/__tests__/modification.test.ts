import { describe, expect, it } from 'vitest';
import { classifyModificationIntent, getEffectiveScope, INTENT_SCOPE_MAP } from '../modification';

describe('classifyModificationIntent', () => {
  it('returns budget for budget-related feedback', () => {
    const result = classifyModificationIntent('预算砍到80以下');
    expect(result.intent_type).toBe('budget');
    expect(result.affected_scope).toBe('local');
  });

  it('returns cuisine for cuisine change', () => {
    const result = classifyModificationIntent('换日料吧，不想吃粤菜了');
    expect(result.intent_type).toBe('cuisine');
    expect(result.affected_scope).toBe('local');
  });

  it('returns location for area change', () => {
    const result = classifyModificationIntent('换个区域，去后海附近');
    expect(result.intent_type).toBe('location');
    expect(result.affected_scope).toBe('full');
  });

  it('returns event_mode for mode change', () => {
    const result = classifyModificationIntent('光吃饭不够，加个唱歌');
    expect(result.intent_type).toBe('event_mode');
    expect(result.affected_scope).toBe('full');
  });

  it('returns hard_constraint for dietary restrictions', () => {
    const result = classifyModificationIntent('有人海鲜过敏，别选海鲜');
    expect(result.intent_type).toBe('hard_constraint');
    expect(result.affected_scope).toBe('full');
  });

  it('returns custom for unrecognized patterns', () => {
    const result = classifyModificationIntent('我觉得方案不够好，换个思路');
    expect(result.intent_type).toBe('custom');
    expect(result.affected_scope).toBe('full');
  });

  it('returns empty ai_interpretation when AI is unavailable (stub mode)', () => {
    const result = classifyModificationIntent('太贵了');
    expect(result.ai_interpretation).toBe('');
  });
});

describe('INTENT_SCOPE_MAP', () => {
  it('maps budget to local', () => {
    expect(INTENT_SCOPE_MAP.budget).toBe('local');
  });

  it('maps location to full', () => {
    expect(INTENT_SCOPE_MAP.location).toBe('full');
  });
});

describe('getEffectiveScope', () => {
  it('returns local when all suggestions are local', () => {
    expect(getEffectiveScope(['budget', 'cuisine'])).toBe('local');
  });

  it('returns full when any suggestion is full scope', () => {
    expect(getEffectiveScope(['budget', 'location'])).toBe('full');
  });

  it('returns full for empty list', () => {
    expect(getEffectiveScope([])).toBe('full');
  });
});
