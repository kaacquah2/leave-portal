'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import AdminPortal from '@/components/admin-portal'
import { getCurrentUser, logout } from '@/lib/auth-client'

function AdminPortalWrapper({ onLogout }: { onLogout: () => void }) {
  return <AdminPortal onLogout={onLogout} />
}

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    // Check authentication via API
    const checkAuth = async () => {
      const user = await getCurrentUser()
      
      if (!user || user.role !== 'admin') {
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
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-background to-purple-50/30 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <AdminPortalWrapper onLogout={handleLogout} />
    </Suspense>
  )
}

