'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Suggestion {
  id: string;
  event_id: string;
  invitation_id: string;
  feedback_text: string;
  intent_type: string | null;
  affected_scope: string | null;
  ai_interpretation: string | null;
  status: string;
  created_at: string;
}

interface Props {
  eventId: string;
}

const INTENT_LABELS: Record<string, string> = {
  budget: '预算调整',
  cuisine: '菜系变更',
  location: '区域变更',
  event_mode: '局类型变更',
  hard_constraint: '新增限制',
  custom: '其他修改',
};

export default function ModificationReviewPanel({ eventId }: Props) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch(`/api/events/${eventId}/modify/suggestions?status=pending`, {
        cache: 'no-store',
      });
      if (!res.ok || !alive) return;
      const json = await res.json();
      if (alive && Array.isArray(json.suggestions)) {
        setSuggestions(json.suggestions);
        setSelected(new Set(json.suggestions.map((s: Suggestion) => s.id)));
      }
    }
    load();
  }, [eventId]);

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

  if (pendingCount === 0) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function execute(approve: boolean) {
    const ids = approve ? [...selected] : [...selected];
    if (ids.length === 0) return;

    setExecuting(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/modify/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_ids: approve ? ids : [],
          rejected_ids: approve ? [] : ids,
        }),
      });

      const d = await res.json();
      if (!res.ok) {
        setError(typeof d.error === 'string' ? d.error : '执行失败');
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--r)',
        border: '1px solid var(--border2)',
        padding: '20px 24px',
        boxShadow: 'var(--sh)',
        marginBottom: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', fontFamily: 'var(--fb)' }}>
          修改建议 · {pendingCount} 条待审核
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {suggestions.map((s) => (
          <label
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 'var(--rs)',
              border: `1px solid ${selected.has(s.id) ? 'var(--text)' : 'var(--border2)'}`,
              background: 'var(--bg)',
              cursor: 'pointer',
              fontFamily: 'var(--fb)',
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(s.id)}
              onChange={() => toggle(s.id)}
              style={{ marginTop: 2, accentColor: 'var(--text)' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                &ldquo;{s.feedback_text}&rdquo;
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {s.intent_type && (
                  <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--lav)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '1px 7px' }}>
                    {INTENT_LABELS[s.intent_type] ?? s.intent_type}
                  </span>
                )}
                {s.affected_scope && (
                  <span style={{ fontSize: 10, color: s.affected_scope === 'local' ? 'oklch(48% 0.14 148)' : 'oklch(44% 0.15 72)', background: 'var(--bg2)', borderRadius: 6, padding: '1px 7px' }}>
                    {s.affected_scope === 'local' ? '局部替换' : '全量重算'}
                  </span>
                )}
                {s.ai_interpretation && (
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>
                    AI: {s.ai_interpretation}
                  </span>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={() => execute(false)}
          disabled={executing || selected.size === 0}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--rs)',
            border: '1px solid var(--border2)',
            background: 'var(--bg)',
            color: 'var(--muted)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--fb)',
            cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          拒绝选中
        </button>
        <button
          onClick={() => execute(true)}
          disabled={executing || selected.size === 0}
          style={{
            padding: '8px 20px',
            borderRadius: 'var(--rs)',
            border: 'none',
            background: selected.size > 0 ? 'var(--text)' : 'var(--border2)',
            color: selected.size > 0 ? 'var(--bg)' : 'var(--muted)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--fb)',
            cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          {executing ? '执行中…' : '执行选中修改'}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'oklch(50% 0.18 26)', fontFamily: 'var(--fb)', margin: '10px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}
