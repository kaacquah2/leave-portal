'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Portal from '@/components/portal'
import { getCurrentUser, logout } from '@/lib/auth-client'

function PortalWrapper({ onLogout, staffId }: { onLogout: () => void, staffId?: string }) {
  return <Portal userRole="manager" onLogout={onLogout} staffId={staffId} />
}

export default function ManagerPage() {
  const router = useRouter()
  const [staffId, setStaffId] = useState<string | undefined>(undefined)

  useEffect(() => {
    // Check authentication via API
    const checkAuth = async () => {
      const user = await getCurrentUser()
      
      if (!user || user.role !== 'manager') {
        router.push('/')
        return
      }
      
      if (user.staffId) {
        setStaffId(user.staffId)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PortalWrapper onLogout={handleLogout} staffId={staffId} />
    </Suspense>
  )
}

