import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { IcsCalendarExporter } from '@groupplan/calendar';
import type { CalendarData } from '@groupplan/types';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  // Service client — guests access this link from their email without an auth session.
  const supabase = createServiceClient();

  const { data: plan } = await supabase
    .from('finalized_plans')
    .select('*')
    .eq('event_id', id)
    .single();

  if (!plan) return NextResponse.json({ error: 'No finalized plan' }, { status: 404 });

  const exporter = new IcsCalendarExporter();
  const result = await exporter.export(plan.calendar_data as CalendarData);

  return new NextResponse(result.content as string, {
    headers: {
      'Content-Type':        result.content_type,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
}
