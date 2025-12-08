'use client'

import { useState } from 'react'
import Landing from '@/components/landing'
import LoginForm from '@/components/login-form'
import Portal from '@/components/portal'

export default function Page() {
  const [stage, setStage] = useState<'landing' | 'login' | 'portal'>('landing')
  const [userRole, setUserRole] = useState<'hr' | 'manager'>('hr')

  const handleSignIn = () => {
    setStage('login')
  }

  const handleLoginSuccess = (role: 'hr' | 'manager') => {
    setUserRole(role)
    setStage('portal')
  }

  const handleLogout = () => {
    setStage('landing')
    setUserRole('hr')
  }

  return (
    <div className="min-h-screen bg-background">
      {stage === 'landing' && <Landing onSignIn={handleSignIn} />}
      {stage === 'login' && <LoginForm onLoginSuccess={handleLoginSuccess} onBack={() => setStage('landing')} />}
      {stage === 'portal' && <Portal userRole={userRole} onLogout={handleLogout} />}
    </div>
  )
}
