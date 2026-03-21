import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// All (host) routes require authentication; middleware also guards this path
export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
