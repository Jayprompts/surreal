import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // A self-contained server build (.next/standalone) for the VPS; traced from the monorepo root.
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '..'),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
