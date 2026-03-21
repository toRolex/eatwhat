import type { Metadata } from 'next';
import EventCreateForm from '@/components/forms/EventCreateForm';

export const metadata: Metadata = { title: 'Create event' };

export default function NewEventPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">Create an event</h1>
      <EventCreateForm />
    </main>
  );
}
