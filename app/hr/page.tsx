'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Portal from '@/components/portal'
import { useAuth } from '@/hooks/use-auth'
import { AuthLoadingSkeleton } from '@/components/loading-skeletons'

function PortalWrapper({ onLogout }: { onLogout: () => void }) {
  return <Portal userRole="hr" onLogout={onLogout} />
}

export default function HRPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated, logout, hasRole } = useAuth()

  // Redirect if not authenticated or not HR
  if (!loading && (!isAuthenticated || !hasRole(['hr', 'hr_assistant', 'HR_OFFICER', 'HR_DIRECTOR']))) {
    router.push('/')
    return null
  }

  if (loading) {
    return <AuthLoadingSkeleton />
  }

  if (!isAuthenticated || !hasRole(['hr', 'hr_assistant', 'HR_OFFICER', 'HR_DIRECTOR'])) {
    return null
  }

  return (
    <Suspense fallback={<AuthLoadingSkeleton />}>
      <PortalWrapper onLogout={logout} />
    </Suspense>
  )
}

