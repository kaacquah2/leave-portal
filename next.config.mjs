import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
// Check TAURI environment variable for static export
const isTauri = process.env.TAURI === '1';

const nextConfig = {
  // Explicitly set the workspace root to silence lockfile warning
  outputFileTracingRoot: __dirname,
  
  // CRITICAL: For Tauri builds - static export ONLY, no server features
  ...(isTauri ? {
    output: 'export',
    trailingSlash: true,
    reactStrictMode: true,
    // Note: eslint config removed - deprecated in Next.js 16
    // Use .eslintignore or eslint config file instead
  } : {
    trailingSlash: false,
  }),
  
  images: {
    unoptimized: true,
  },
  
  // Note: rewrites() removed for Tauri builds - not needed and causes warnings
  // Static export doesn't support rewrites anyway
  // Security: CSP headers configuration
  // NOTE: headers() is incompatible with static export (output: 'export')
  // For Electron builds (static export), CSP is injected via meta tag in HTML (see app/layout.tsx)
  // For web builds (non-static), headers() is used for runtime CSP injection
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
  // 
  // For Tauri (static export): CSP is injected via <meta> tag in app/layout.tsx
  // For Web (non-static): headers() provides runtime CSP injection
  ...(process.env.TAURI !== '1' ? {
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
  } : {}),
  // Suppress middleware deprecation warning (middleware.ts is still the correct approach in Next.js 16)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Use webpack instead of Turbopack to avoid symlink permission issues on Windows
  // For Tauri builds, skip webpack config (Turbopack is fine for static export)
  ...(isTauri ? {} : {
  webpack: (config, { isServer, webpack }) => {
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
    
    // Ignore Tauri modules during static export builds (they're only available at runtime in Tauri)
    if (process.env.TAURI === '1' && !isServer) {
      // Use both IgnorePlugin and externals to prevent webpack from trying to resolve Tauri modules
      if (!config.plugins) {
        config.plugins = []
      }
      // IgnorePlugin prevents webpack from bundling Tauri modules
      // The warning about module not found is expected and harmless
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@tauri-apps\/.*$/
        })
      )
      
      // Suppress warnings about missing Tauri modules
      if (!config.ignoreWarnings) {
        config.ignoreWarnings = []
      }
      config.ignoreWarnings.push({
        module: /@tauri-apps\/.*/
      })
      
      // Also add to externals as a fallback - return undefined to ignore the module
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals
        config.externals = (context, request, callback) => {
          if (request && request.startsWith('@tauri-apps/')) {
            // Return undefined to tell webpack to ignore this module
            return callback()
          }
          return originalExternals(context, request, callback)
        }
      } else if (Array.isArray(config.externals)) {
        config.externals.push(({ request }) => {
          if (request && request.startsWith('@tauri-apps/')) {
            return undefined
          }
          return false
        })
      } else {
        config.externals = [
          config.externals || [],
          ({ request }) => {
            if (request && request.startsWith('@tauri-apps/')) {
              return undefined
            }
            return false
          }
        ]
      }
    }
    
    // Note: API routes in app/api are automatically ignored by Next.js during static export
    // when output: 'export' is set. No additional webpack configuration needed.
    
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
  }),
}

export default nextConfig
