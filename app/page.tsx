'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Landing from '@/components/landing'
import LoginForm from '@/components/login-form'
import Portal from '@/components/portal'

function PortalWrapper({ userRole, onLogout, staffId }: { userRole: 'hr' | 'manager' | 'employee' | 'admin', onLogout: () => void, staffId?: string }) {
  return <Portal userRole={userRole} onLogout={onLogout} staffId={staffId} />
}

export default function Page() {
  const router = useRouter()
  const [stage, setStage] = useState<'landing' | 'login' | 'portal' | 'checking'>('checking')
  const [userRole, setUserRole] = useState<'hr' | 'manager' | 'employee' | 'admin'>('hr')
  const [staffId, setStaffId] = useState<string | undefined>(undefined)

  // Check if user is already logged in on page load/reload
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        })

        if (response.ok) {
          const user = await response.json()
          const role = user.role as 'hr' | 'manager' | 'employee' | 'admin'
          
          // Redirect to role-specific page if on root
          if (role === 'hr' && window.location.pathname === '/') {
            router.push('/hr')
            return
          } else if (role === 'manager' && window.location.pathname === '/') {
            router.push('/manager')
            return
          } else if (role === 'admin' && window.location.pathname === '/') {
            router.push('/admin')
            return
          } else if (role === 'employee' && window.location.pathname === '/') {
            router.push('/employee')
            return
          }
          
          // If already on a role-specific page or staying on root, restore session
          setUserRole(role)
          if (user.staffId) setStaffId(user.staffId)
          setStage('portal')
        } else {
          // No auth found, show landing page
          setStage('landing')
        }
      } catch (error) {
        // Error fetching user, show landing page
        setStage('landing')
      }
    }

    checkAuth()
  }, [router])

  const handleSignIn = () => {
    setStage('login')
  }

  const handleLoginSuccess = (role: 'hr' | 'manager' | 'employee' | 'admin', id?: string) => {
    setUserRole(role)
    if (id) setStaffId(id)
    setStage('portal')
    
    // Redirect to role-specific page after login
    if (role === 'hr') {
      router.push('/hr')
    } else if (role === 'manager') {
      router.push('/manager')
    } else if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'employee') {
      router.push('/employee')
    }
  }

  const handleLogout = async () => {
    // Call logout API to clear cookie
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    setStage('landing')
    setUserRole('hr')
    setStaffId(undefined)
  }

  // Show loading while checking authentication
  if (stage === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {stage === 'landing' && <Landing onSignIn={handleSignIn} />}
      {stage === 'login' && <LoginForm onLoginSuccess={handleLoginSuccess} onBack={() => setStage('landing')} />}
      {stage === 'portal' && (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
          <PortalWrapper userRole={userRole} onLogout={handleLogout} staffId={staffId} />
        </Suspense>
      )}
    </div>
  )
}
