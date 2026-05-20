import type { CalendarData } from '@groupplan/types';
import { createEvent } from 'ics';

export interface CalendarExportResult {
  content: string | Buffer;
  content_type: string;
  filename: string;
}

// Implement this interface to add GCal API push alongside .ics download
export interface CalendarExporter {
  export(data: CalendarData): Promise<CalendarExportResult>;
}

export class IcsCalendarExporter implements CalendarExporter {
  async export(data: CalendarData): Promise<CalendarExportResult> {
    const start = new Date(data.start_time);
    const end   = new Date(data.end_time);

    const { error, value } = createEvent({
      productId:      '-//GroupPlan//GroupPlan//EN',
      title:          data.title,
      description:    data.description,
      location:       data.location,
      // Emit UTC timestamps (DTSTART/DTEND with Z suffix) so every calendar
      // app interprets the time correctly regardless of server timezone.
      startInputType: 'utc',
      endInputType:   'utc',
      start: [
        start.getUTCFullYear(),
        start.getUTCMonth() + 1,
        start.getUTCDate(),
        start.getUTCHours(),
        start.getUTCMinutes(),
      ],
      end: [
        end.getUTCFullYear(),
        end.getUTCMonth() + 1,
        end.getUTCDate(),
        end.getUTCHours(),
        end.getUTCMinutes(),
      ],
      status:    'CONFIRMED',
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
