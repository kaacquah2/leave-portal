'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import EmployeePortal from '@/components/employee-portal'
import { getCurrentUser, logout, type AuthUser } from '@/lib/auth-client'
import { type UserRole } from '@/lib/permissions'

function EmployeePortalWrapper({ staffId, userRole, onLogout }: { staffId: string, userRole: UserRole, onLogout: () => void }) {
  return <EmployeePortal staffId={staffId} userRole={userRole} onLogout={onLogout} />
}

export default function EmployeePage() {
  const router = useRouter()
  const [staffId, setStaffId] = useState<string | undefined>(undefined)
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined)

  useEffect(() => {
    // Check authentication via API
    const checkAuth = async () => {
      const user = await getCurrentUser()
      
      if (!user || user.role !== 'employee') {
        router.push('/')
        return
      }
      
      if (user.staffId) {
        setStaffId(user.staffId)
        setUserRole(user.role as UserRole)
      } else {
        router.push('/')
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await logout()
  }

  if (!staffId || !userRole) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <EmployeePortalWrapper staffId={staffId} userRole={userRole} onLogout={handleLogout} />
    </Suspense>
  )
}

