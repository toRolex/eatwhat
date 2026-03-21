import type { Metadata } from 'next';
import MagicLinkForm from '@/components/forms/MagicLinkForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900">Sign in to GroupPlan</h1>
          <p className="text-sm text-zinc-500">We'll email you a magic link — no password needed.</p>
        </div>
        <MagicLinkForm />
      </div>
    </main>
  );
}
