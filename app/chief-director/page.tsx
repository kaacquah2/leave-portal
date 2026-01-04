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

export default function ChiefDirectorPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout, hasRole } = useAuth()

  // Accept chief director roles
  const allowedRoles: UserRole[] = ['CHIEF_DIRECTOR', 'chief_director'] as UserRole[]

  // Redirect if not authenticated or not chief director
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
        userRole={user?.role || 'CHIEF_DIRECTOR'} 
      />
    </Suspense>
  )
}

