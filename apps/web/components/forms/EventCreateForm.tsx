'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { id: 'dinner',   label: 'Dinner',   description: 'Restaurant picks for the group', disabled: false },
  { id: 'activity', label: 'Activity', description: 'Coming soon', disabled: true },
  { id: 'movie',    label: 'Movie',    description: 'Coming soon', disabled: true },
];

const TEMPLATES = [
  { id: 'classic',  label: 'Classic',  description: 'Elegant dark card' },
  { id: 'minimal',  label: 'Minimal',  description: 'Clean white layout' },
  { id: 'gradient', label: 'Gradient', description: 'Colourful gradient wash' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  border: '1px solid var(--border2)',
  borderRadius: 'var(--rs)',
  fontSize: 14,
  fontFamily: 'var(--fb)',
  color: 'var(--text)',
  background: 'var(--bg)',
  outline: 'none',
  transition: 'border-color .15s',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  marginBottom: 7,
  fontFamily: 'var(--fb)',
};

export default function EventCreateForm() {
  const router = useRouter();

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState<string>('dinner');
  const [template,    setTemplate]    = useState('classic');
  const [location,    setLocation]    = useState('');
  const [deadline,    setDeadline]    = useState('');
  const [voteDeadline, setVoteDeadline] = useState('');
  const [proposedDate,  setProposedDate]  = useState('');
  const [dateFlexible,  setDateFlexible]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description:   description || undefined,
        category,
        template_id:   template,
        location_hint: location || undefined,
        date_flexible:  dateFlexible,
        proposed_date:  !dateFlexible && proposedDate ? new Date(proposedDate).toISOString() : undefined,
        rsvp_deadline: new Date(deadline).toISOString(),
        vote_deadline: voteDeadline ? new Date(voteDeadline).toISOString() : undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === 'string' ? data.error : 'Something went wrong');
      return;
    }

    const { event } = await res.json();
    router.push(`/events/${event.id}`);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <label htmlFor="title" style={labelStyle}>Event name</label>
        <input
          id="title" type="text" required maxLength={120}
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Friday Night Dinner"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        />
      </div>

      <div>
        <label htmlFor="description" style={labelStyle}>
          Description <span style={{ color: 'var(--border)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
        </label>
        <textarea
          id="description" maxLength={500} rows={3}
          value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="A quick note for your guests…"
          style={{ ...inputStyle, resize: 'none' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        />
      </div>

      <div>
        <label htmlFor="location" style={labelStyle}>
          General area <span style={{ color: 'var(--border)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
        </label>
        <input
          id="location" type="text" maxLength={200}
          value={location} onChange={(e) => setLocation(e.target.value)}
          placeholder="Downtown Toronto, ON"
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        />
      </div>

      <div>
        <label htmlFor="deadline" style={labelStyle}>RSVP deadline</label>
        <input
          id="deadline" type="datetime-local" required
          value={deadline} onChange={(e) => setDeadline(e.target.value)}
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        />
      </div>

      <div>
        <label style={labelStyle}>Event date</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: dateFlexible ? 0 : 10 }}>
          <button
            type="button"
            onClick={() => setDateFlexible(f => !f)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 12px', borderRadius: 'var(--rs)',
              border: `1px solid ${dateFlexible ? 'var(--text)' : 'var(--border2)'}`,
              background: dateFlexible ? 'var(--text)' : 'var(--bg)',
              color: dateFlexible ? 'var(--bg)' : 'var(--muted)',
              fontSize: 12, fontWeight: 500, fontFamily: 'var(--fb)', cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: 3,
              border: `1.5px solid ${dateFlexible ? 'var(--bg)' : 'var(--border)'}`,
              background: dateFlexible ? 'var(--bg)' : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {dateFlexible && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5l2.5 2.5L8 1" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            Date flexible
          </button>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)' }}>
            {dateFlexible ? 'Guests will be notified when date is set' : 'Set a specific date'}
          </span>
        </div>
        {!dateFlexible && (
          <input
            id="proposed-date" type="datetime-local"
            value={proposedDate} onChange={(e) => setProposedDate(e.target.value)}
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          />
        )}
      </div>

      <div>
        <label htmlFor="vote-deadline" style={labelStyle}>
          Vote deadline <span style={{ color: 'var(--border)', fontWeight: 400, textTransform: 'none' }}>(optional — auto-finalizes the winner if set)</span>
        </label>
        <input
          id="vote-deadline" type="datetime-local"
          value={voteDeadline} onChange={(e) => setVoteDeadline(e.target.value)}
          style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--text)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        />
      </div>

      <div>
        <p style={labelStyle}>Event type</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id} type="button" onClick={() => !c.disabled && setCategory(c.id)}
              style={{
                padding: '12px 10px',
                borderRadius: 'var(--rs)',
                border: `1px solid ${category === c.id ? 'var(--text)' : 'var(--border2)'}`,
                background: category === c.id ? 'var(--bg2)' : 'var(--bg)',
                textAlign: 'left',
                cursor: c.disabled ? 'default' : 'pointer',
                opacity: c.disabled ? 0.45 : 1,
                transition: 'border-color .15s, background .15s',
                boxShadow: category === c.id ? '0 0 0 1px var(--text)' : 'none',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)', margin: '0 0 3px' }}>{c.label}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0 }}>{c.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p style={labelStyle}>Invitation template</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.id} type="button" onClick={() => setTemplate(t.id)}
              style={{
                padding: '12px 10px',
                borderRadius: 'var(--rs)',
                border: `1px solid ${template === t.id ? 'var(--text)' : 'var(--border2)'}`,
                background: template === t.id ? 'var(--bg2)' : 'var(--bg)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color .15s, background .15s',
                boxShadow: template === t.id ? '0 0 0 1px var(--text)' : 'none',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--fb)', margin: '0 0 3px' }}>{t.label}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--fb)', margin: 0 }}>{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: 'oklch(50% 0.18 26)', fontFamily: 'var(--fb)', margin: 0 }}>{error}</p>
      )}

      <button
        type="submit" disabled={loading}
        style={{ width: '100%', padding: '12px 0', borderRadius: 'var(--rs)', border: 'none', background: 'var(--text)', color: 'var(--bg)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--fb)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'opacity .15s', letterSpacing: '-.01em' }}
        onMouseEnter={e => !loading && (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => !loading && (e.currentTarget.style.opacity = '1')}
      >
        {loading ? 'Creating…' : 'Create event'}
      </button>
    </form>
  );
}
