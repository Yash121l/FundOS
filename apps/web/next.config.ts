import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fundos/ui', '@fundos/shared', '@fundos/analytics', '@fundos/types', '@fundos/database', '@fundos/ai'],
  serverExternalPackages: ['@prisma/client', 'prisma'],
  experimental: {
    optimizePackageImports: ['@fundos/ui'],
  },
}

export default nextConfig
