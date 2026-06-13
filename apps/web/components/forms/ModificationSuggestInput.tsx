'use client';

import { useState } from 'react';

interface Props {
  eventId: string;
}

interface SuggestionResult {
  id: string;
  feedback_text: string;
  intent_type: string | null;
  affected_scope: string | null;
  ai_interpretation: string | null;
  status: string;
}

export default function ModificationSuggestInput({ eventId }: Props) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/modify/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback_text: trimmed }),
      });

      const d = await res.json();
      if (!res.ok) {
        setError(typeof d.error === 'string' ? d.error : '提交失败');
        return;
      }

      setResult(d.suggestion);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const labels: Record<string, string> = {
      budget: '预算调整',
      cuisine: '菜系变更',
      location: '区域变更',
      event_mode: '局类型变更',
      hard_constraint: '新增限制',
      custom: '其他修改',
    };

    return (
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--r)',
          border: '1px solid var(--border2)',
          padding: '16px 20px',
          boxShadow: 'var(--sh)',
          marginTop: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="oklch(60% 0.15 148)" strokeWidth="1.5" />
            <path d="M5 8l2 2 4-4" stroke="oklch(60% 0.15 148)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)' }}>
            建议已提交
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 6px', lineHeight: 1.5 }}>
          &ldquo;{result.feedback_text}&rdquo;
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {result.intent_type && (
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--lav)', fontFamily: 'var(--fb)', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '2px 8px' }}>
              {labels[result.intent_type] ?? result.intent_type}
            </span>
          )}
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', background: 'var(--bg2)', borderRadius: 6, padding: '2px 8px' }}>
            待组织者审核
          </span>
        </div>
        <button
          onClick={() => setResult(null)}
          style={{
            marginTop: 10,
            fontSize: 12,
            color: 'var(--sky)',
            fontFamily: 'var(--fb)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          再提一条
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--r)',
        border: '1px solid var(--border2)',
        padding: '20px 24px',
        boxShadow: 'var(--sh)',
        marginTop: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>💬</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)' }}>
          对方案有想法？
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: '0 0 14px', lineHeight: 1.5 }}>
        想让预算低一点、换个菜系、或者加一站？告诉海鸥，组织者会看到你的建议。
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="预算砍到80以下，太贵了"
        rows={2}
        maxLength={500}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--rs)',
          fontSize: 13,
          fontFamily: 'var(--fb)',
          color: 'var(--text)',
          background: 'var(--bg)',
          outline: 'none',
          boxSizing: 'border-box',
          resize: 'vertical',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--text)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>
          {text.length}/500
        </span>
        <button
          onClick={submit}
          disabled={submitting || !text.trim()}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--rs)',
            border: 'none',
            background: text.trim() ? 'var(--text)' : 'var(--border2)',
            color: text.trim() ? 'var(--bg)' : 'var(--muted)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--fb)',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? '提交中…' : '提交建议'}
        </button>
      </div>
      {error && (
        <p style={{ fontSize: 12, color: 'oklch(50% 0.18 26)', fontFamily: 'var(--fb)', margin: '8px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}
