import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import withPWA from 'next-pwa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const isElectron = process.env.ELECTRON || process.env.ELECTRON_BUILD;

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Use static export for Electron builds
  // Check for ELECTRON env variable or if building for Electron (electron-builder sets this)
  // Note: API routes cannot be statically exported, so Electron app should point to remote API
  // We'll handle API routes by excluding them from the static build
  // The warning about static export disabling API routes is EXPECTED and INTENTIONAL for Electron builds
  output: isElectron ? 'export' : undefined,
  outputFileTracingRoot: resolve(__dirname),
  // For Electron builds, ensure trailing slash is handled correctly
  // Static export should generate relative paths by default
  ...(isElectron ? {
    trailingSlash: false,
  } : {}),
  // Suppress middleware deprecation warning (middleware.ts is still the correct approach in Next.js 16)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Use webpack instead of Turbopack to avoid symlink permission issues on Windows
  webpack: (config, { isServer }) => {
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
    
    // For Electron builds, ensure webpack generates relative paths
    if (isElectron && !isServer) {
      // Set output.publicPath to relative path for Electron file:// protocol
      if (config.output) {
        config.output.publicPath = './'
      } else {
        config.output = { publicPath: './' }
      }
    }
    
    return config
  },
}

// PWA Configuration
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable in dev mode
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\/api\/.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https:\/\/.*\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
  ],
})

export default pwaConfig(nextConfig)
