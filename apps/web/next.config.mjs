/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@groupplan/ai',
    '@groupplan/db',
    '@groupplan/types',
    '@groupplan/venues',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.googleusercontent.com https://places.googleapis.com https://maps.googleapis.com https://*.yelpcdn.com; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
