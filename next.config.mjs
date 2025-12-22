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
  // Use webpack instead of Turbopack to avoid symlink permission issues on Windows
  webpack: (config, { isServer }) => {
    // Ensure proper module resolution for server-side packages
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      }
      // Ensure node_modules are properly resolved
      config.resolve.modules = ['node_modules', ...(config.resolve.modules || [])]
    }
    return config
  },
}

export default nextConfig
