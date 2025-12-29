'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDataStore } from '@/lib/data-store'
import { useRealtime } from '@/lib/use-realtime'
import Header from '@/components/header'
import AdminNavigation from '@/components/admin-navigation'
import AdminDashboard from '@/components/admin-dashboard'
import AdminUserManagement from '@/components/admin-user-management'
import AdminPasswordResetRequests from '@/components/admin-password-reset-requests'
import AdminAuditLogs from '@/components/admin-audit-logs'
import AdminSystemSettings from '@/components/admin-system-settings'
import TwoFactorSetup from '@/components/two-factor-setup'

interface AdminPortalProps {
  onLogout: () => void
}

export default function AdminPortal({ onLogout }: AdminPortalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('dashboard')
  const store = useDataStore({ enablePolling: true, pollingInterval: 60000, userRole: 'admin' })
  const { connected } = useRealtime(true)

  // Sync activeTab state with URL on mount and when URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'dashboard'
    setActiveTab(tabFromUrl)
    
    // Set initial URL if no tab parameter exists
    if (!searchParams.get('tab')) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'dashboard')
      router.replace(`?${params.toString()}`, { scroll: false })
    }
  }, [searchParams, router])

  // Update URL when activeTab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const params = new URLSearchParams()
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />
      case 'users':
        return <AdminUserManagement />
      case 'password-resets':
        return <AdminPasswordResetRequests />
      case 'audit-logs':
        return <AdminAuditLogs />
      case '2fa':
        return <TwoFactorSetup />
      case 'settings':
        return <AdminSystemSettings />
      default:
        return <AdminDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-background to-purple-50/30">
      <Header onLogout={onLogout} userRole="admin" />
      <div className="flex">
        <AdminNavigation activeTab={activeTab} setActiveTab={handleTabChange} onLogout={onLogout} />
        <main className="flex-1 overflow-auto min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-96px)]">
          <div className="p-4 sm:p-6 md:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

