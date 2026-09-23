import path from 'node:path';
import type { NextConfig } from 'next';

if (process.env.VERCEL === '1' && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    'Set NEXT_PUBLIC_API_URL to the Nest API origin including /api/v1 (the second Vercel project).',
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: [
    '@forestwatch/api-client',
    '@forestwatch/config',
    '@forestwatch/i18n',
    '@forestwatch/types',
    '@forestwatch/validation',
    'leaflet',
    'react-leaflet',
  ],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  },
  // Next 15.5 DevTools SegmentViewNode corrupts the Windows webpack client manifest.
  devIndicators: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
