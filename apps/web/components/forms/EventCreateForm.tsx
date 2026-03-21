'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TEMPLATES = [
  { id: 'classic',  label: 'Classic',  description: 'Elegant dark card' },
  { id: 'minimal',  label: 'Minimal',  description: 'Clean white layout' },
  { id: 'gradient', label: 'Gradient', description: 'Colourful gradient wash' },
];

export default function EventCreateForm() {
  const router = useRouter();

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [template,    setTemplate]    = useState('classic');
  const [location,    setLocation]    = useState('');
  const [deadline,    setDeadline]    = useState('');
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
        template_id:   template,
        location_hint: location || undefined,
        date_flexible: true,
        rsvp_deadline: new Date(deadline).toISOString(),
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
    <form onSubmit={handleSubmit} className="space-y-6">

      <div className="space-y-1">
        <label htmlFor="title" className="block text-sm font-medium text-zinc-700">Event name</label>
        <input
          id="title"
          type="text"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Friday Night Dinner"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium text-zinc-700">
          Description <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          maxLength={500}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A quick note for your guests…"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="block text-sm font-medium text-zinc-700">
          General area <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <input
          id="location"
          type="text"
          maxLength={200}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Downtown Toronto, ON"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="deadline" className="block text-sm font-medium text-zinc-700">RSVP deadline</label>
        <input
          id="deadline"
          type="datetime-local"
          required
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-700">Invitation template</p>
        <div className="grid grid-cols-3 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={`p-3 rounded-xl border text-left transition-colors ${
                template === t.id
                  ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                  : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <p className="text-sm font-medium text-zinc-900">{t.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Creating…' : 'Create event'}
      </button>
    </form>
  );
}
