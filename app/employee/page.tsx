'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import EmployeePortal from '@/components/employee-portal'
import { useAuth } from '@/hooks/use-auth'
import { AuthLoadingSkeleton } from '@/components/loading-skeletons'
import { type UserRole } from '@/lib/roles'

function EmployeePortalWrapper({ staffId, userRole, onLogout }: { staffId: string, userRole: UserRole, onLogout: () => void }) {
  return <EmployeePortal staffId={staffId} userRole={userRole} onLogout={onLogout} />
}

export default function EmployeePage() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout, hasRole } = useAuth()

  // Redirect if not authenticated or not employee
  if (!loading && (!isAuthenticated || !hasRole(['employee', 'EMPLOYEE']))) {
    router.push('/')
    return null
  }

  if (loading) {
    return <AuthLoadingSkeleton />
  }

  if (!isAuthenticated || !hasRole(['employee', 'EMPLOYEE']) || !user?.staffId) {
    return null
  }

  return (
    <Suspense fallback={<AuthLoadingSkeleton />}>
      <EmployeePortalWrapper 
        staffId={user.staffId} 
        userRole={user.role as UserRole} 
        onLogout={logout} 
      />
    </Suspense>
  )
}

