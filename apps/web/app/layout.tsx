import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | GroupPlan',
    default: 'GroupPlan — The Friday Gathering',
  },
  description: 'AI-powered group restaurant planning. Beautiful invitations, smart recommendations, easy voting.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap"
          rel="stylesheet"
        />
        {/* Apply dark mode synchronously to avoid a light-mode flash on hard reload.
            We mutate <html> not <body> so React's hydration check on <body> stays clean,
            and CSS reads from html[data-theme] OR body.dark (set later in client). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=JSON.parse(localStorage.getItem('gp_tweaks')||'{}');if(t.darkMode){document.documentElement.dataset.theme='dark';}}catch(e){}`,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
