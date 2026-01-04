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

export default function HeadIndependentUnitPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout, hasRole } = useAuth()

  // Accept head of independent unit roles
  const allowedRoles: UserRole[] = ['HEAD_OF_INDEPENDENT_UNIT'] as UserRole[]

  // Redirect if not authenticated or not head of independent unit
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
        userRole={user?.role || 'HEAD_OF_INDEPENDENT_UNIT'} 
      />
    </Suspense>
  )
}

