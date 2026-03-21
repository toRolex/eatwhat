import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | GroupPlan',
    default:  'GroupPlan — Group dining, made easy',
  },
  description: 'AI-powered group restaurant planning. Beautiful invitations, smart recommendations, easy voting.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
