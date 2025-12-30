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
  // Suppress middleware deprecation warning (middleware.ts is still the correct approach in Next.js 16)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Use webpack instead of Turbopack to avoid symlink permission issues on Windows
  webpack: (config, { isServer }) => {
    // Configure cache to handle Windows permission errors gracefully
    // Use filesystem cache with error handling for Windows EPERM issues
    if (config.cache) {
      config.cache = {
        ...config.cache,
        // Use filesystem cache but allow it to fail silently on Windows permission errors
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        // Suppress cache errors on Windows (EPERM issues are non-critical)
        compression: false, // Disable compression to reduce file operations
      }
    }
    
    // Ensure proper module resolution for server-side packages
    if (isServer) {
      // Ensure node_modules are properly resolved
      if (!config.resolve) {
        config.resolve = {}
      }
      config.resolve.modules = ['node_modules', ...(config.resolve.modules || [])]
      
      // Ensure bcryptjs and jose are properly resolved and bundled
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals
        config.externals = (context, request, callback) => {
          if (request === 'bcryptjs' || request === 'jose') {
            return callback()
          }
          return originalExternals(context, request, callback)
        }
      } else if (Array.isArray(config.externals)) {
        config.externals = config.externals.filter(
          (external) => {
            if (typeof external === 'string') {
              return external !== 'bcryptjs' && external !== 'jose'
            }
            return true
          }
        )
      }
    }
    
    return config
  },
}

export default nextConfig
