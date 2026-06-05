import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fundos/ui', '@fundos/shared', '@fundos/analytics', '@fundos/types', '@fundos/database', '@fundos/ai'],
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // standalone output copies only the required server files — used by the Docker web-runner stage
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@fundos/ui'],
  },
}

export default nextConfig
