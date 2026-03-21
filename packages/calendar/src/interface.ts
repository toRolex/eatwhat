import type { CalendarData } from '@groupplan/types';

export interface CalendarExportResult {
  content: string | Buffer;
  content_type: string;
  filename: string;
}

// Implement this interface to add GCal API push alongside .ics download
export interface CalendarExporter {
  export(data: CalendarData): Promise<CalendarExportResult>;
}
