import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly set the workspace root to silence lockfile warning
  outputFileTracingRoot: __dirname,
  // Export static files for Electron builds (offline capability)
  output: process.env.ELECTRON === '1' ? 'export' : undefined,
  typescript: {
    // Removed ignoreBuildErrors to ensure type safety in production
    // All TypeScript errors must be fixed before deployment
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
    
    // Ensure proper module resolution
    if (!config.resolve) {
      config.resolve = {}
    }
    
    // Configure path aliases to match tsconfig.json
    if (!config.resolve.alias) {
      config.resolve.alias = {}
    }
    config.resolve.alias['@'] = resolve(__dirname)
    
    // Ensure proper file extension resolution
    if (!config.resolve.extensions) {
      config.resolve.extensions = []
    }
    if (!config.resolve.extensions.includes('.ts')) {
      config.resolve.extensions.unshift('.ts', '.tsx', '.js', '.jsx')
    }
    
    // Ensure node_modules are properly resolved
    config.resolve.modules = ['node_modules', ...(config.resolve.modules || [])]
    
    // Ensure proper module resolution for server-side packages
    if (isServer) {
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
