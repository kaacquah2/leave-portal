import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { APP_CONFIG } from '@/lib/app-config'
import './globals.css'

export const metadata: Metadata = {
  title: APP_CONFIG.fullTitle,
  description: `${APP_CONFIG.appDescription} for the ${APP_CONFIG.organizationName}`,
  generator: 'v0.app',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
