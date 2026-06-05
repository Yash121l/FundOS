import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fundos/ui', '@fundos/shared', '@fundos/analytics', '@fundos/types'],
  serverExternalPackages: ['@prisma/client', 'prisma', '@sentry/nextjs', 'bcryptjs'],

  // standalone output copies only the required server files — used by the Docker web-runner stage
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@fundos/ui'],
  },
}

export default nextConfig
