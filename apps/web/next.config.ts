import path from 'node:path';
import type { NextConfig } from 'next';

const publicApiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

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
    NEXT_PUBLIC_API_URL: publicApiUrl,
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
