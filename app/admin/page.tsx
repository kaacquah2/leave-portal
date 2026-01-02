'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import AdminPortal from '@/components/admin-portal'
import { useAuth } from '@/hooks/use-auth'
import { AuthLoadingSkeleton } from '@/components/loading-skeletons'

function AdminPortalWrapper({ onLogout }: { onLogout: () => void }) {
  return <AdminPortal onLogout={onLogout} />
}

export default function AdminPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout, hasRole } = useAuth()

  // Redirect if not authenticated or not admin
  if (!loading && (!isAuthenticated || !hasRole(['admin', 'SYSTEM_ADMIN', 'SYS_ADMIN']))) {
    router.push('/')
    return null
  }

  if (loading) {
    return <AuthLoadingSkeleton />
  }

  if (!isAuthenticated || !hasRole(['admin', 'SYSTEM_ADMIN', 'SYS_ADMIN'])) {
    return null
  }

  return (
    <Suspense fallback={<AuthLoadingSkeleton />}>
      <AdminPortalWrapper onLogout={logout} />
    </Suspense>
  )
}

