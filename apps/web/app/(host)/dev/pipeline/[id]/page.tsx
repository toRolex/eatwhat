import type { Metadata } from 'next';
import type React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAiLogsByEvent } from '@groupplan/db';
import RetriggerButton from './RetriggerButton';

export const metadata: Metadata = { title: 'Pipeline inspector' };

type AiLogRow = {
  id: string;
  event_id: string;
  stage: string;
  provider: string;
  model: string;
  input_hash: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  cost_micros: number | null;
  error: string | null;
  created_at: string | null;
};

type PipelineRun = {
  runIndex: number;
  startedAt: string;
  stages: AiLogRow[];
  totalCostMicros: number;
  totalLatencyMs: number;
  hasErrors: boolean;
};

function groupIntoRuns(logs: AiLogRow[]): PipelineRun[] {
  if (logs.length === 0) return [];
  const sorted = [...logs].sort((a, b) =>
    (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  );
  const runs: PipelineRun[] = [];
  let current: AiLogRow[] = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const prevRow = sorted[i - 1]!;
    const row = sorted[i]!;
    const prev = new Date(prevRow.created_at ?? 0).getTime();
    const curr = new Date(row.created_at ?? 0).getTime();
    if (curr - prev > 120_000) {
      runs.push(buildRun(runs.length, current));
      current = [row];
    } else {
      current.push(row);
    }
  }
  runs.push(buildRun(runs.length, current));
  return runs;
}

function buildRun(index: number, stages: AiLogRow[]): PipelineRun {
  return {
    runIndex: index,
    startedAt: stages[0]!.created_at ?? '',
    stages,
    totalCostMicros: stages.reduce((s, r) => s + (r.cost_micros ?? 0), 0),
    totalLatencyMs: stages.reduce((s, r) => s + (r.latency_ms ?? 0), 0),
    hasErrors: stages.some(r => r.error !== null),
  };
}

export default async function PipelineInspectorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from('events')
    .select('id, title, status')
    .eq('id', id)
    .eq('host_id', user!.id)
    .single();

  if (!event) notFound();

  const serviceDb = createServiceClient();
  const { data: rawLogs } = await getAiLogsByEvent(serviceDb, id);

  const logs: AiLogRow[] = (rawLogs ?? []) as AiLogRow[];
  const runs = groupIntoRuns(logs);

  const canRetrigger = event.status === 'collecting' || event.status === 'deciding';

  const thStyle: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--fb)', padding: '6px 12px', textAlign: 'left', fontWeight: 600, letterSpacing: '.05em' };
  const tdStyle: React.CSSProperties = { fontSize: 12, fontFamily: 'var(--fb)', padding: '7px 12px', borderBottom: '1px solid var(--border2)' };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 6 }}>
        <Link href="/dev/pipeline" style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', textDecoration: 'none' }}>Back to events</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 28, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 4px' }}>{event.title}</h1>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '3px 8px', textTransform: 'capitalize' }}>{event.status}</span>
        </div>
        <RetriggerButton eventId={id} disabled={!canRetrigger} />
      </div>

      {runs.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--fb)', background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)' }}>
          No pipeline runs found for this event.
        </div>
      )}

      {runs.slice().reverse().map(run => {
        const maxLatency = Math.max(...run.stages.map(s => s.latency_ms ?? 0), 1);
        const startLabel = new Date(run.startedAt).toLocaleString();
        const costLabel = '$' + (run.totalCostMicros / 1_000_000).toFixed(4);
        return (
          <div key={run.runIndex} style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid ' + (run.hasErrors ? 'oklch(55% 0.2 26)' : 'var(--border2)'), boxShadow: 'var(--sh)', marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: run.hasErrors ? 'oklch(55% 0.2 26)' : 'oklch(60% 0.16 148)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--fb)', color: 'var(--text)' }}>Run {run.runIndex + 1}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>{startLabel}</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--fb)', color: 'var(--muted)', marginLeft: 'auto' }}>
                {run.totalLatencyMs}ms total &middot; {costLabel}
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border2)' }}>
                  {['Stage', 'Provider', 'Model', 'Latency', 'Tokens', 'Cost', 'Error'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {run.stages.map(s => {
                  const barW = s.latency_ms != null ? ((s.latency_ms / maxLatency) * 120).toFixed(0) : '0';
                  const stageCost = s.cost_micros != null ? '$' + (s.cost_micros / 1_000_000).toFixed(4) : '-';
                  return (
                    <tr key={s.id} style={{ background: s.error ? 'oklch(97% 0.01 26)' : 'transparent' }}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{s.stage}</td>
                      <td style={{ ...tdStyle, color: 'var(--muted)' }}>{s.provider}</td>
                      <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 11 }}>{s.model}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{s.latency_ms != null ? s.latency_ms + 'ms' : '-'}</span>
                          <div style={{ width: barW + 'px', height: 4, background: 'var(--text)', borderRadius: 2, flexShrink: 0 }} />
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 11 }}>
                        {s.input_tokens != null && s.output_tokens != null ? s.input_tokens + ' to ' + s.output_tokens : '-'}
                      </td>
                      <td style={tdStyle}>{stageCost}</td>
                      <td style={tdStyle}>
                        {s.error && (
                          <span style={{ background: 'oklch(55% 0.2 26)', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 600 }}>
                            {s.error.slice(0, 40)}{s.error.length > 40 ? '...' : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </main>
  );
}
