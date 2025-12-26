'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Portal from '@/components/portal'
import { getCurrentUser, logout } from '@/lib/auth-client'

function PortalWrapper({ onLogout }: { onLogout: () => void }) {
  return <Portal userRole="hr" onLogout={onLogout} />
}

export default function HRPage() {
  const router = useRouter()

  useEffect(() => {
    // Check authentication via API
    const checkAuth = async () => {
      const user = await getCurrentUser()
      
      if (!user || user.role !== 'hr') {
        router.push('/')
        return
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PortalWrapper onLogout={handleLogout} />
    </Suspense>
  )
}

