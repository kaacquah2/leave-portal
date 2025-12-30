# PWA Quick Start Guide
## Convert Web App to Installable Mobile App in 1 Hour

This guide shows you how to quickly convert your existing HR Leave Portal into a Progressive Web App (PWA) that users can install on their mobile devices.

---

## ✅ What You Already Have

- ✅ Service Worker (`public/sw.js`) - Already implemented!
- ✅ Push Notifications - Already set up!
- ✅ Responsive Design - Mobile-ready UI
- ✅ Next.js App - Ready for PWA

---

## 🚀 Quick Implementation (30 minutes)

### Step 1: Install next-pwa

```bash
npm install next-pwa
```

### Step 2: Update next.config.mjs

Add PWA configuration to your existing `next.config.mjs`:

```javascript
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import withPWA from 'next-pwa'

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
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      if (!config.resolve) {
        config.resolve = {}
      }
      config.resolve.modules = ['node_modules', ...(config.resolve.modules || [])]
      
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

// Wrap with PWA
export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable in dev
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
  ],
})(nextConfig)
```

### Step 3: Create manifest.json

Create `public/manifest.json`:

```json
{
  "name": "MoFA HR Leave Portal",
  "short_name": "HR Portal",
  "description": "Ministry of Fisheries and Aquaculture - HR Staff Leave Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e40af",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["business", "productivity"],
  "screenshots": [],
  "shortcuts": [
    {
      "name": "Apply Leave",
      "short_name": "Leave",
      "description": "Submit a new leave request",
      "url": "/employee?tab=leave-request",
      "icons": [{ "src": "/icon-192x192.png", "sizes": "192x192" }]
    },
    {
      "name": "View Balance",
      "short_name": "Balance",
      "description": "Check leave balance",
      "url": "/employee?tab=leave-balances",
      "icons": [{ "src": "/icon-192x192.png", "sizes": "192x192" }]
    }
  ]
}
```

### Step 4: Update app/layout.tsx

Add manifest link and PWA meta tags:

```typescript
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { APP_CONFIG } from '@/lib/app-config'
import './globals.css'

export const metadata: Metadata = {
  title: APP_CONFIG.fullTitle,
  description: `${APP_CONFIG.appDescription} for the ${APP_CONFIG.organizationName}`,
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_CONFIG.shortTitle || 'HR Portal',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: APP_CONFIG.fullTitle,
    title: APP_CONFIG.fullTitle,
    description: APP_CONFIG.appDescription,
  },
  twitter: {
    card: 'summary',
    title: APP_CONFIG.fullTitle,
    description: APP_CONFIG.appDescription,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HR Portal" />
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
```

### Step 5: Create App Icons

You need to create app icons. Use your existing logo or create new ones:

**Required Sizes:**
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

Place these in the `public/` folder.

**Quick Icon Generation:**
You can use online tools like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

Or use your existing `mofa-logo.png` and resize it.

### Step 6: Add Install Prompt Component (Optional but Recommended)

Create `components/pwa-install-prompt.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Store dismissal in localStorage to not show again for a while
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Don't show if already installed or recently dismissed
  if (isInstalled || !showPrompt) return null

  const dismissedTime = localStorage.getItem('pwa-install-dismissed')
  if (dismissedTime && Date.now() - parseInt(dismissedTime) < 7 * 24 * 60 * 60 * 1000) {
    return null // Don't show for 7 days after dismissal
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install HR Leave Portal</DialogTitle>
          <DialogDescription>
            Install this app on your device for quick access and a better experience.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleDismiss}>
            <X className="mr-2 h-4 w-4" />
            Not Now
          </Button>
          <Button onClick={handleInstall}>
            <Download className="mr-2 h-4 w-4" />
            Install
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

Add to your main layout or home page:

```typescript
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'

// In your component
<PWAInstallPrompt />
```

---

## 🧪 Testing

### 1. Build and Test Locally

```bash
npm run build
npm start
```

### 2. Test on Mobile Device

1. **Deploy to production** (Vercel, etc.) - PWA requires HTTPS
2. **Open on mobile browser** (Chrome, Safari, etc.)
3. **Look for install prompt** or browser menu option
4. **Test installation**
5. **Test offline functionality**

### 3. Validate PWA

Use Chrome DevTools:
1. Open DevTools → Application tab
2. Check "Manifest" section
3. Check "Service Workers" section
4. Test "Lighthouse" → PWA audit

---

## 📱 Installation Instructions for Users

### Android (Chrome):
1. Open the app in Chrome
2. Tap the menu (3 dots)
3. Select "Add to Home screen" or "Install app"
4. Confirm installation

### iOS (Safari):
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Customize name and tap "Add"

---

## ✅ What You Get

After implementing this:

✅ **Installable App** - Users can install on home screen  
✅ **Offline Support** - Basic caching for offline access  
✅ **App-like Experience** - Standalone display mode  
✅ **Fast Loading** - Cached resources  
✅ **Push Notifications** - Already working!  
✅ **App Icons** - Custom icons on home screen  

---

## 🚀 Next Steps

1. **Test thoroughly** on iOS and Android
2. **Customize icons** with your branding
3. **Add more caching** for offline features
4. **Consider React Native** for full native app (see MOBILE-APP-CONVERSION-GUIDE.md)

---

## 🐛 Troubleshooting

### Service Worker Not Registering
- Ensure you're on HTTPS (or localhost)
- Check browser console for errors
- Clear browser cache

### Icons Not Showing
- Verify icon files exist in `public/` folder
- Check manifest.json paths are correct
- Ensure icons are proper size and format

### Install Prompt Not Showing
- Some browsers don't show prompt automatically
- Users can manually install via browser menu
- Check if app is already installed

---

**Time to Complete**: ~30 minutes  
**Result**: Installable mobile app! 🎉

