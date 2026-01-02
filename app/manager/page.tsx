'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Portal from '@/components/portal'
import { useAuth } from '@/hooks/use-auth'
import { AuthLoadingSkeleton } from '@/components/loading-skeletons'
import { type UserRole } from '@/lib/permissions'

function PortalWrapper({ onLogout, staffId, userRole }: { onLogout: () => void, staffId?: string, userRole: string }) {
  return <Portal userRole={userRole as any} onLogout={onLogout} staffId={staffId} />
}

export default function ManagerPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout, hasRole } = useAuth()

  // Accept manager, supervisor, and SUPERVISOR roles
  const allowedRoles: UserRole[] = ['manager', 'supervisor', 'SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR'] as UserRole[]

  // Redirect if not authenticated or not manager
  if (!loading && (!isAuthenticated || !hasRole(allowedRoles))) {
    router.push('/')
    return null
  }

  if (loading) {
    return <AuthLoadingSkeleton />
  }

  if (!isAuthenticated || !hasRole(allowedRoles)) {
    return null
  }

  return (
    <Suspense fallback={<AuthLoadingSkeleton />}>
      <PortalWrapper 
        onLogout={logout} 
        staffId={user?.staffId || undefined} 
        userRole={user?.role || 'manager'} 
      />
    </Suspense>
  )
}

