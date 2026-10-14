import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fundos/ui', '@fundos/shared', '@fundos/analytics', '@fundos/types'],
  serverExternalPackages: ['@prisma/client', 'prisma', '@sentry/nextjs', 'bcryptjs'],

  // standalone output copies only the required server files — used by the Docker web-runner stage
  output: 'standalone',

  // PostHog reverse proxy: the browser sends analytics to /ingest on our own
  // domain so ad blockers don't drop it. middleware.ts strips cookies first.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/array/:path*', destination: 'https://us-assets.i.posthog.com/array/:path*' },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ]
  },
  experimental: {
    optimizePackageImports: ['@fundos/ui'],
  },
}

export default nextConfig
