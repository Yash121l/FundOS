import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@fundos/ui', '@fundos/shared', '@fundos/analytics', '@fundos/types'],
  experimental: {
    optimizePackageImports: ['@fundos/ui'],
  },
}

export default nextConfig
