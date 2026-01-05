'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Portal from '@/components/portal'
import { useAuth } from '@/hooks/use-auth'
import { AuthLoadingSkeleton } from '@/components/loading-skeletons'
import { type UserRole } from '@/lib/roles'

function PortalWrapper({ onLogout, staffId, userRole }: { onLogout: () => void, staffId?: string, userRole: string }) {
  return <Portal userRole={userRole as any} onLogout={onLogout} staffId={staffId} />
}

export default function SupervisorPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout, hasRole } = useAuth()

  // Accept supervisor roles
  const allowedRoles: UserRole[] = ['SUPERVISOR', 'supervisor', 'manager'] as UserRole[]

  // Redirect if not authenticated or not supervisor
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
        userRole={user?.role || 'SUPERVISOR'} 
      />
    </Suspense>
  )
}

