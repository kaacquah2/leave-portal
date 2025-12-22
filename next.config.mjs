import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  outputFileTracingRoot: resolve(__dirname),
  // Suppress middleware deprecation warning (middleware.ts is still the correct approach in Next.js 16)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Mark server-only packages to prevent client-side bundling
  serverComponentsExternalPackages: ['bcryptjs', 'jose'],
  // Use webpack instead of Turbopack to avoid symlink permission issues on Windows
  webpack: (config, { isServer }) => {
    // Ensure proper module resolution for server-side packages
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      }
      // Ensure node_modules are properly resolved
      config.resolve.modules = ['node_modules', ...(config.resolve.modules || [])]
      // Don't externalize these packages - they need to be bundled
      config.externals = config.externals || []
    }
    return config
  },
}

export default nextConfig
