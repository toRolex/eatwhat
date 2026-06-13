import { NextResponse } from 'next/server';
import { getEventById, getUsageByEvent } from '@/lib/db';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params;

  const { data: event } = getEventById(id);
  if (!event || (event as Record<string, unknown>).host_id !== 'demo-host') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: rows } = getUsageByEvent(id);
  const log = (rows ?? []) as Array<Record<string, unknown>>;

  const totals: Record<string, { cost_micros: number; count: number; input_tokens: number; output_tokens: number }> = {};
  for (const r of log) {
    if (!totals[r.kind as string]) totals[r.kind as string] = { cost_micros: 0, count: 0, input_tokens: 0, output_tokens: 0 };
    totals[r.kind as string]!.cost_micros += (r.cost_micros as number) ?? 0;
    totals[r.kind as string]!.count += (r.request_count as number) ?? 1;
    totals[r.kind as string]!.input_tokens += (r.input_tokens as number) ?? 0;
    totals[r.kind as string]!.output_tokens += (r.output_tokens as number) ?? 0;
  }

  const total_cost_micros = log.reduce((sum, r) => sum + ((r.cost_micros as number) ?? 0), 0);

  return NextResponse.json({
    log,
    totals,
    total_cost_micros,
    total_cost_display: formatMicros(total_cost_micros),
  });
}

function formatMicros(micros: number): string {
  const dollars = micros / 1_000_000;
  if (dollars < 0.01) return '<$0.01';
  return `$${dollars.toFixed(dollars < 1 ? 3 : 2)}`;
}
