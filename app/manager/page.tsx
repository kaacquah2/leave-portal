'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Portal from '@/components/portal'
import { getCurrentUser, logout } from '@/lib/auth-client'

function PortalWrapper({ onLogout, staffId, userRole }: { onLogout: () => void, staffId?: string, userRole: string }) {
  return <Portal userRole={userRole as any} onLogout={onLogout} staffId={staffId} />
}

export default function ManagerPage() {
  const router = useRouter()
  const [staffId, setStaffId] = useState<string | undefined>(undefined)
  const [userRole, setUserRole] = useState<string>('manager')

  useEffect(() => {
    // Check authentication via API
    const checkAuth = async () => {
      const user = await getCurrentUser()
      
      // Accept manager, supervisor, and SUPERVISOR roles
      const allowedRoles = ['manager', 'supervisor', 'SUPERVISOR']
      if (!user || !allowedRoles.includes(user.role)) {
        router.push('/')
        return
      }
      
      // Set the actual user role
      setUserRole(user.role)
      
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
      <PortalWrapper onLogout={handleLogout} staffId={staffId} userRole={userRole} />
    </Suspense>
  )
}

