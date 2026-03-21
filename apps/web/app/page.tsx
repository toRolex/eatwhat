import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900">
          GroupPlan
        </h1>
        <p className="text-xl text-zinc-500">
          Beautiful invitations. AI-powered recommendations.
          <br />
          One dinner, no group chat chaos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </main>
  );
}
