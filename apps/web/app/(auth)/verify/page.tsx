import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Check your email' };

export default function VerifyPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-4xl">✉️</div>
        <h1 className="text-2xl font-bold text-zinc-900">Check your email</h1>
        <p className="text-sm text-zinc-500">
          We sent a magic link to your inbox. Click it to sign in — the link expires in 1 hour.
        </p>
      </div>
    </main>
  );
}
