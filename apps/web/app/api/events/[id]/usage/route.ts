import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEventById, getUsageByEvent } from '@groupplan/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: event } = await getEventById(supabase, id);
  if (!event || event.host_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: rows } = await getUsageByEvent(supabase, id);
  const log = rows ?? [];

  // Aggregate by kind
  const totals: Record<string, { cost_micros: number; count: number; input_tokens: number; output_tokens: number }> = {};
  for (const r of log) {
    if (!totals[r.kind]) totals[r.kind] = { cost_micros: 0, count: 0, input_tokens: 0, output_tokens: 0 };
    totals[r.kind]!.cost_micros   += r.cost_micros ?? 0;
    totals[r.kind]!.count         += r.request_count ?? 1;
    totals[r.kind]!.input_tokens  += r.input_tokens  ?? 0;
    totals[r.kind]!.output_tokens += r.output_tokens ?? 0;
  }

  const total_cost_micros = log.reduce((sum, r) => sum + (r.cost_micros ?? 0), 0);

  return NextResponse.json({
    log,
    totals,
    total_cost_micros,
    total_cost_display: formatMicros(total_cost_micros),
  });
}

function formatMicros(micros: number): string {
  const dollars = micros / 1_000_000;
  if (dollars < 0.01) return `<$0.01`;
  return `$${dollars.toFixed(dollars < 1 ? 3 : 2)}`;
}
