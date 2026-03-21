import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    remotePatterns: [
      // Yelp CDN for restaurant photos
      { protocol: 'https', hostname: '**.yelpcdn.com' },
      // Firebase Storage for host-uploaded cover images
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      // Supabase Storage (if used for avatars)
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  // Packages use TypeScript source directly; Next transpiles them
  transpilePackages: [
    '@groupplan/types',
    '@groupplan/db',
    '@groupplan/ai',
    '@groupplan/venues',
    '@groupplan/notifications',
    '@groupplan/calendar',
  ],
};

export default config;
