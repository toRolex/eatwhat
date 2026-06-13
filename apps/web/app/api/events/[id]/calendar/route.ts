import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { IcsCalendarExporter } from '@/lib/calendar';
import type { CalendarData } from '@groupplan/types';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const db = getDb();

  const plan = db.prepare('SELECT * FROM finalized_plans WHERE event_id = ?').get(id) as Record<string, unknown> | undefined;

  if (!plan) return NextResponse.json({ error: 'No finalized plan' }, { status: 404 });

  const exporter = new IcsCalendarExporter();
  const calendarData = typeof plan.calendar_data === 'string'
    ? JSON.parse(plan.calendar_data)
    : plan.calendar_data;
  const result = await exporter.export(calendarData as unknown as CalendarData);

  return new NextResponse(result.content as string, {
    headers: {
      'Content-Type': result.content_type,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
}
