'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Home } from 'lucide-react'
import { useIsMobile } from '@/components/ui/use-mobile'

interface NavigationControlsProps {
  showHome?: boolean
  onBack?: () => void
  onForward?: () => void
  className?: string
}

export default function NavigationControls({ 
  showHome = true, 
  onBack,
  onForward,
  className = '' 
}: NavigationControlsProps) {
  const router = useRouter()
  const isMobile = useIsMobile()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  const handleForward = () => {
    if (onForward) {
      onForward()
    } else {
      router.forward()
    }
  }

  const handleHome = () => {
    router.push('/?tab=dashboard')
  }

  // Don't show on mobile to save space (navigation is via menu)
  if (isMobile) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="h-8 w-8"
        aria-label="Go back"
        title="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleForward}
        className="h-8 w-8"
        aria-label="Go forward"
        title="Go forward"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
      {showHome && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleHome}
          className="h-8 w-8"
          aria-label="Go to dashboard"
          title="Go to dashboard"
        >
          <Home className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

