import { describe, it, expect } from 'vitest';
import { IcsCalendarExporter } from './calendar';
import type { CalendarData } from '@groupplan/types';

const fixture: CalendarData = {
  title: 'Team Offsite',
  description: 'Annual planning session',
  location: 'San Francisco, CA',
  start_time: '2026-06-15T09:00:00.000Z',
  end_time: '2026-06-15T17:00:00.000Z',
  attendees: [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
  ],
};

describe('IcsCalendarExporter', () => {
  it('returns the correct content_type', async () => {
    const result = await new IcsCalendarExporter().export(fixture);
    expect(result.content_type).toBe('text/calendar; charset=utf-8');
  });

  it('returns a filename ending with .ics', async () => {
    const result = await new IcsCalendarExporter().export(fixture);
    expect(result.filename).toMatch(/\.ics$/);
  });

  it('content includes BEGIN:VCALENDAR', async () => {
    const result = await new IcsCalendarExporter().export(fixture);
    expect(String(result.content)).toContain('BEGIN:VCALENDAR');
  });

  it('content includes DTSTART', async () => {
    const result = await new IcsCalendarExporter().export(fixture);
    expect(String(result.content)).toContain('DTSTART');
  });

  it('content includes the fixture title', async () => {
    const result = await new IcsCalendarExporter().export(fixture);
    expect(String(result.content)).toContain(fixture.title);
  });
});
