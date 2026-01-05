import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/toaster'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { ConditionalAnalytics } from '@/components/conditional-analytics'
import { OfflineStatus } from '@/components/offline-status'
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
    title: APP_CONFIG.appNameShort || 'HR Portal',
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
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HR Portal" />
        {/* CSP meta tag for Electron builds (static export doesn't support headers()) */}
        {/* This is evaluated at build time when ELECTRON=1, so it's safe to use process.env */}
        {/* Note: 'unsafe-eval' is required for Next.js webpack code splitting in static exports */}
        {typeof process !== 'undefined' && process.env.ELECTRON === '1' && (
          <meta
            httpEquiv="Content-Security-Policy"
            content={
              "default-src 'self' app:; " +
              "script-src 'self' app: 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' app: 'unsafe-inline'; " +
              "style-src-elem 'self' app: 'unsafe-inline'; " +
              "img-src 'self' app: data: https:; " +
              "font-src 'self' app: data: https:; " +
              "connect-src 'self' https:; " +
              "manifest-src 'self' app: https:;"
            }
          />
        )}
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <PWAInstallPrompt />
        <Toaster />
        <ConditionalAnalytics />
        <OfflineStatus />
      </body>
    </html>
  )
}
