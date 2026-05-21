import { describe, it, expect, vi, afterEach } from 'vitest';
import { runImplicitInference, EventRecord } from './implicit-inference';

vi.mock('../utils/logger', () => ({ safeLogStage: vi.fn() }));

function makeEvent(overrides?: Partial<EventRecord>): EventRecord {
  return { id: 'evt-1', title: 'Team lunch', event_date: null, guest_count: 4, ...overrides };
}

describe('runImplicitInference', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Birthday dinner -> celebration type, formality >= 0.3, celebratory ambiance item', () => {
    const event = makeEvent({ title: 'Birthday dinner' });

    const result = runImplicitInference(event);

    expect(result.context.event_type_hint).toBe('celebration');
    expect(result.context.formality_bias).toBeGreaterThanOrEqual(0.3);
    expect(result.inferred.some(item => item.category === 'ambiance' && item.value === 'celebratory')).toBe(true);
  });

  it('Team offsite -> work type, formality >= 0.5', () => {
    const event = makeEvent({ title: 'Team offsite' });

    const result = runImplicitInference(event);

    expect(result.context.event_type_hint).toBe('work');
    expect(result.context.formality_bias).toBeGreaterThanOrEqual(0.5);
  });

  it('Date night -> date type, romantic ambiance item', () => {
    const event = makeEvent({ title: 'Date night' });

    const result = runImplicitInference(event);

    expect(result.context.event_type_hint).toBe('date');
    expect(result.inferred.some(item => item.value === 'romantic')).toBe(true);
  });

  it('null event_date -> dinner meal_type, no crash', () => {
    const event = makeEvent({ event_date: null });

    const result = runImplicitInference(event);

    expect(result.context.meal_type).toBe('dinner');
  });

  it('group_size_class from guest_count', () => {
    const intimate = runImplicitInference(makeEvent({ guest_count: 2 }));
    const medium = runImplicitInference(makeEvent({ guest_count: 7 }));
    const large = runImplicitInference(makeEvent({ guest_count: 14 }));

    expect(intimate.context.group_size_class).toBe('intimate');
    expect(medium.context.group_size_class).toBe('medium');
    expect(large.context.group_size_class).toBe('large');
  });

  it('20:00 UTC event -> late_night, formality_bias > 0', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
    const event = makeEvent({ title: 'Dinner', event_date: '2025-08-01T20:00:00.000Z' });

    const result = runImplicitInference(event);

    expect(result.context.meal_type).toBe('late_night');
    expect(result.context.formality_bias).toBeGreaterThan(0);
  });

  it('Saturday 11:00 UTC -> brunch', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(11);
    vi.spyOn(Date.prototype, 'getDay').mockReturnValue(6);
    const event = makeEvent({ title: 'Lunch', event_date: '2025-08-02T11:00:00.000Z' });

    const result = runImplicitInference(event);

    expect(result.context.meal_type).toBe('brunch');
  });

  it('Cheap quick lunch -> service_speed and budget inferred items', () => {
    const event = makeEvent({ title: 'Cheap quick lunch' });

    const result = runImplicitInference(event);
    const serviceSpeed = result.inferred.find(item => item.category === 'service_speed');
    const budget = result.inferred.find(item => item.category === 'budget');

    expect(serviceSpeed).toBeDefined();
    expect(budget).toBeDefined();
    expect(serviceSpeed?.strength).toBe('inferred');
    expect(budget?.strength).toBe('inferred');
  });

  it('Fancy dinner -> upscale inferred item with strength inferred (never hard)', () => {
    const event = makeEvent({ title: 'Fancy dinner' });

    const result = runImplicitInference(event);
    const upscale = result.inferred.find(item => item.value === 'upscale');

    expect(upscale).toBeDefined();
    expect(upscale?.strength).toBe('inferred');
    expect(upscale?.strength).not.toBe('hard');
  });

  it('All inferred items across multiple titles have strength !== hard', () => {
    for (const title of ['Birthday dinner', 'Date night', 'Team offsite', 'Cheap quick lunch', 'Fancy dinner', 'with parents']) {
      const r = runImplicitInference(makeEvent({ title }));

      expect(r.inferred.every(item => item.strength !== 'hard')).toBe(true);
    }
  });
});
