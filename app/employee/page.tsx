'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import EmployeePortal from '@/components/employee-portal'
import { getCurrentUser, logout } from '@/lib/auth-client'

function EmployeePortalWrapper({ staffId, onLogout }: { staffId: string, onLogout: () => void }) {
  return <EmployeePortal staffId={staffId} onLogout={onLogout} />
}

export default function EmployeePage() {
  const router = useRouter()
  const [staffId, setStaffId] = useState<string | undefined>(undefined)

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
      } else {
        router.push('/')
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await logout()
  }

  if (!staffId) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <EmployeePortalWrapper staffId={staffId} onLogout={handleLogout} />
    </Suspense>
  )
}

