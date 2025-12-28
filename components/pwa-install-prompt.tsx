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
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return
      }

      // Check if running as PWA
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true)
        return
      }

      // Listen for beforeinstallprompt event
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
        // Show prompt after a delay to not interrupt user
        setTimeout(() => {
          const dismissedTime = localStorage.getItem('pwa-install-dismissed')
          if (!dismissedTime || Date.now() - parseInt(dismissedTime) > 7 * 24 * 60 * 60 * 1000) {
            setShowPrompt(true)
          }
        }, 3000) // Show after 3 seconds
      }

      window.addEventListener('beforeinstallprompt', handler)

      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    } catch (error) {
      console.error('Error showing install prompt:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Store dismissal in localStorage to not show again for a while
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    }
  }

  // Don't show if already installed
  if (isInstalled || !showPrompt) return null

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install HR Leave Portal</DialogTitle>
          <DialogDescription>
            Install this app on your device for quick access and a better mobile experience. You'll be able to access it even when offline.
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

