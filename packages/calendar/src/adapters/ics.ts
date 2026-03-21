import { createEvent } from 'ics';
import type { CalendarExporter, CalendarExportResult } from '../interface';
import type { CalendarData } from '@groupplan/types';

export class IcsCalendarExporter implements CalendarExporter {
  async export(data: CalendarData): Promise<CalendarExportResult> {
    const start = new Date(data.start_time);
    const end   = new Date(data.end_time);

    const { error, value } = createEvent({
      title:       data.title,
      description: data.description,
      location:    data.location,
      start: [
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate(),
        start.getHours(),
        start.getMinutes(),
      ],
      end: [
        end.getFullYear(),
        end.getMonth() + 1,
        end.getDate(),
        end.getHours(),
        end.getMinutes(),
      ],
      attendees: data.attendees.map((a) => ({ name: a.name, email: a.email })),
    });

    if (error || !value) {
      throw new Error(`Failed to generate .ics file: ${error?.message}`);
    }

    return {
      content:      value,
      content_type: 'text/calendar; charset=utf-8',
      filename:     'groupplan-event.ics',
    };
  }
}
