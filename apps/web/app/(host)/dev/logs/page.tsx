import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import { getRecentAiLogs } from '@groupplan/db';

export const metadata: Metadata = { title: 'Log viewer' };

export default async function LogsPage() {
  const serviceDb = createServiceClient();
  const { data: logs } = await getRecentAiLogs(serviceDb, { limit: 200 });

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 32, letterSpacing: '-.03em', color: 'var(--text)', margin: '0 0 6px' }}>Log viewer</h1>
        <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0 }}>Last 200 entries - debug payloads only in PIPELINE_LOG_LEVEL=debug</p>
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border2)', boxShadow: 'var(--sh)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border2)' }}>
              {['Time', 'Event', 'Stage', 'Provider', 'Latency', 'Tokens', 'Cost', 'Error'].map(h => (
                <th key={h} style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--fb)', padding: '8px 12px', textAlign: 'left', fontWeight: 600, letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((row, i) => {
              const hasError = row.error !== null;
              const eventTitle = (row.events as { title: string } | null)?.title ?? 'unknown';
              const truncatedTitle = eventTitle.length > 24 ? eventTitle.slice(0, 24) + '...' : eventTitle;
              const time = row.created_at ? new Date(row.created_at).toLocaleTimeString() : '-';
              const cost = row.cost_micros != null ? '$' + (row.cost_micros / 1_000_000).toFixed(4) : '-';
              return (
                <tr
                  key={row.id}
                  style={{
                    borderLeft: hasError ? '3px solid oklch(55% 0.2 26)' : '3px solid transparent',
                    background: hasError ? 'oklch(97% 0.01 26)' : i % 2 === 0 ? 'var(--surface)' : 'var(--bg)',
                  }}
                >
                  <td style={{ fontSize: 12, fontFamily: 'var(--fb)', padding: '8px 12px', borderBottom: '1px solid var(--border2)', whiteSpace: 'nowrap' }}>{time}</td>
                  <td style={{ fontSize: 12, fontFamily: 'var(--fb)', padding: '8px 12px', borderBottom: '1px solid var(--border2)', color: 'var(--muted)' }}>{truncatedTitle}</td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace', padding: '8px 12px', borderBottom: '1px solid var(--border2)', whiteSpace: 'nowrap' }}>{row.stage}</td>
                  <td style={{ fontSize: 11, fontFamily: 'var(--fb)', padding: '8px 12px', borderBottom: '1px solid var(--border2)', color: 'var(--muted)' }}>{row.provider}</td>
                  <td style={{ fontSize: 12, fontFamily: 'var(--fb)', padding: '8px 12px', borderBottom: '1px solid var(--border2)', textAlign: 'right' }}>{row.latency_ms != null ? row.latency_ms + 'ms' : '-'}</td>
                  <td style={{ fontSize: 11, fontFamily: 'var(--fb)', padding: '8px 12px', borderBottom: '1px solid var(--border2)', color: 'var(--muted)' }}>{row.input_tokens != null && row.output_tokens != null ? row.input_tokens + ' to ' + row.output_tokens : '-'}</td>
                  <td style={{ fontSize: 12, fontFamily: 'var(--fb)', padding: '8px 12px', borderBottom: '1px solid var(--border2)', whiteSpace: 'nowrap' }}>{cost}</td>
                  <td style={{ fontSize: 11, fontFamily: 'var(--fb)', padding: '8px 12px', borderBottom: '1px solid var(--border2)' }}>
                    {hasError && (
                      <span style={{ background: 'oklch(55% 0.2 26)', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 600 }}>
                        {(row.error ?? '').slice(0, 40)}{(row.error ?? '').length > 40 ? '...' : ''}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!logs || logs.length === 0) && (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--fb)' }}>No logs yet.</div>
        )}
      </div>
    </main>
  );
}
