'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.body.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.body.classList.toggle('dark', next);
    if (next) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    try {
      const t = JSON.parse(localStorage.getItem('gp_tweaks') ?? '{}');
      localStorage.setItem('gp_tweaks', JSON.stringify({ ...t, darkMode: next }));
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? 'Switch to light' : 'Switch to dark'}
      style={{
        width: 28, height: 28, borderRadius: 8,
        border: '1px solid var(--border2)', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--muted)', transition: 'color .15s, border-color .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
    >
      {dark ? (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="3" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1 1M10.4 10.4l1 1M2.6 11.4l1-1M10.4 3.6l1-1" />
          </g>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M11.5 8.5A4.5 4.5 0 0 1 5.5 2.5a5.5 5.5 0 1 0 6 6z" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}
