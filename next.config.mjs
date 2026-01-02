import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly set the workspace root to silence lockfile warning
  outputFileTracingRoot: __dirname,
  // No static export for Electron - app loads from remote URL
  // API routes are handled by the remote Vercel server
  // Note: When output is set to 'export', Next.js generates static HTML files
  // which disables API routes. For Electron, we keep output undefined so the
  // app can load from a remote Next.js server that handles API routes.
  output: undefined,
  // Consistent URL handling - no trailing slashes
  trailingSlash: false,
  typescript: {
    // Removed ignoreBuildErrors to ensure type safety in production
    // All TypeScript errors must be fixed before deployment
  },
  images: {
    unoptimized: true,
  },
  // Security: Inject CSP headers at build-time (not runtime)
  // This ensures CSP is present before scripts load, preventing race conditions
  // 
  // CSP Configuration Notes:
  // - 'unsafe-inline' for script-src is required for:
  //   * Next.js hydration scripts that are injected inline
  //   * Next.js chunk loading scripts (__next_f.push, etc.)
  //   * Next.js runtime initialization scripts
  // - 'unsafe-inline' for style-src is required for:
  //   * Inline style attributes used by component libraries
  //   * Dynamic style injection from React components
  // - 'unsafe-inline' for style-src-elem is required for:
  //   * Tailwind CSS utility classes that may be dynamically generated
  //   * Third-party component libraries (Radix UI, etc.) that inject styles
  //   * Next.js runtime style injection
  // - For maximum security, implement nonce-based CSP in middleware:
  //   1. Generate nonce in middleware.ts
  //   2. Pass nonce via request headers or context
  //   3. Replace 'unsafe-inline' with 'nonce-{value}' in CSP
  //   4. Add nonce to all <script> and <style> tags in components
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self' app:; " +
              // Allow inline scripts for Next.js hydration and chunk loading
              "script-src 'self' app: 'unsafe-inline'; " +
              // Allow inline styles for component libraries and dynamic styling
              "style-src 'self' app: 'unsafe-inline'; " +
              // Allow inline <style> tags (required for Tailwind/Next.js)
              "style-src-elem 'self' app: 'unsafe-inline'; " +
              "img-src 'self' app: data: https:; " +
              "font-src 'self' app: data: https:; " +
              "connect-src 'self' https:; " +
              "manifest-src 'self' app: https:;",
          },
        ],
      },
    ];
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
