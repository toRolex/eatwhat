/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@groupplan/ai',
    '@groupplan/db',
    '@groupplan/types',
    '@groupplan/venues',
  ],
};

export default nextConfig;
