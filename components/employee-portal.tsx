'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDataStore } from '@/lib/data-store'
import { useRealtime } from '@/lib/use-realtime'
import Header from '@/components/header'
import EmployeeNavigation from '@/components/employee-navigation'
import EmployeeDashboard from '@/components/employee-dashboard'
import EmployeeLeaveBalances from '@/components/employee-leave-balances'
import EmployeeLeaveHistory from '@/components/employee-leave-history'
import NotificationCenter from '@/components/notification-center'
import EmployeeDocuments from '@/components/employee-documents'
import LeaveForm from '@/components/leave-form'
import EmployeeProfileView from '@/components/employee-profile-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import UnauthorizedMessage from '@/components/unauthorized-message'
import { type UserRole } from '@/lib/permissions'
import { hasPermission } from '@/lib/permissions'

interface EmployeePortalProps {
  staffId: string
  userRole: UserRole
  onLogout: () => void
}

export default function EmployeePortal({ staffId, userRole, onLogout }: EmployeePortalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('dashboard')
  const store = useDataStore({ enablePolling: true, pollingInterval: 60000, userRole }) // Poll every 60 seconds
  const { connected } = useRealtime(true) // Enable real-time updates

  // Debug logging
  useEffect(() => {
    const currentStaff = store.staff.find(s => s.staffId === staffId)
    console.log('[EmployeePortal] Render state:', {
      staffId,
      userRole,
      activeTab,
      staffFound: !!currentStaff,
      staffCount: store.staff.length,
      loading: store.loading,
      initialized: store.initialized,
      error: store.error,
      realtimeConnected: connected
    })
  }, [staffId, userRole, activeTab, store, connected])

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

  // Initialize token refresh
  useEffect(() => {
    const { startTokenRefresh } = require('@/lib/token-refresh')
    startTokenRefresh()

    return () => {
      const { stopTokenRefresh } = require('@/lib/token-refresh')
      stopTokenRefresh()
    }
  }, [])

  // Listen for real-time events
  useEffect(() => {
    const handleBalanceUpdate = () => {
      store.refreshCritical()
    }
    const handleNotification = () => {
      // Notifications component handles its own polling
    }

    window.addEventListener('realtime:balance-updated', handleBalanceUpdate)
    window.addEventListener('realtime:notification', handleNotification)

    return () => {
      window.removeEventListener('realtime:balance-updated', handleBalanceUpdate)
      window.removeEventListener('realtime:notification', handleNotification)
    }
  }, [store])
  
  const currentStaff = store.staff.find(s => s.staffId === staffId)

  // Show loading state while data is being fetched
  if (store.loading && !store.initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <EmployeeDashboard store={store} staffId={staffId} userRole={userRole} onNavigate={handleTabChange} />
      case 'apply-leave':
        // Check permission before showing leave form
        if (!hasPermission(userRole, 'employee:leave:create:own')) {
          return <UnauthorizedMessage 
            message="You don't have permission to apply for leave."
            requiredPermission="employee:leave:create:own"
          />
        }
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Apply for Leave</h1>
              <p className="text-muted-foreground mt-1">Submit a new leave request</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Leave Application Form</CardTitle>
              </CardHeader>
              <CardContent>
                <LeaveForm 
                  store={store} 
                  onClose={() => handleTabChange('dashboard')} 
                  staffId={staffId} 
                />
              </CardContent>
            </Card>
          </div>
        )
      case 'leave-balances':
        if (!hasPermission(userRole, 'employee:leave:view:own')) {
          return <UnauthorizedMessage 
            message="You don't have permission to view leave balances."
            requiredPermission="employee:leave:view:own"
          />
        }
        return <EmployeeLeaveBalances store={store} staffId={staffId} />
      case 'leave-history':
        if (!hasPermission(userRole, 'employee:leave:view:own')) {
          return <UnauthorizedMessage 
            message="You don't have permission to view leave history."
            requiredPermission="employee:leave:view:own"
          />
        }
        return <EmployeeLeaveHistory store={store} staffId={staffId} />
      case 'notifications':
        if (!hasPermission(userRole, 'employee:self:view')) {
          return <UnauthorizedMessage 
            message="You don't have permission to view notifications."
            requiredPermission="employee:self:view"
          />
        }
        return <NotificationCenter />
      case 'profile':
        if (!hasPermission(userRole, 'employee:self:view')) {
          return <UnauthorizedMessage 
            message="You don't have permission to view your profile."
            requiredPermission="employee:self:view"
          />
        }
        return <EmployeeProfileView store={store} staffId={staffId} />
      case 'documents':
        if (!hasPermission(userRole, 'employee:self:view')) {
          return <UnauthorizedMessage 
            message="You don't have permission to view documents."
            requiredPermission="employee:self:view"
          />
        }
        return <EmployeeDocuments />
      case 'payslips':
        if (!hasPermission(userRole, 'employee:payslip:view:own')) {
          return <UnauthorizedMessage 
            message="You don't have permission to view payslips."
            requiredPermission="employee:payslip:view:own"
          />
        }
        // Payslips component would go here when implemented
        return (
          <div className="p-8">
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Payslips feature coming soon.</p>
              </CardContent>
            </Card>
          </div>
        )
      case 'performance':
        if (!hasPermission(userRole, 'employee:performance:view:own')) {
          return <UnauthorizedMessage 
            message="You don't have permission to view performance reviews."
            requiredPermission="employee:performance:view:own"
          />
        }
        // Performance component would go here when implemented
        return (
          <div className="p-8">
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Performance reviews feature coming soon.</p>
              </CardContent>
            </Card>
          </div>
        )
      default:
        return <EmployeeDashboard store={store} staffId={staffId} userRole={userRole} onNavigate={handleTabChange} />
    }
  }

  // Don't block rendering if staff is not found - let the dashboard component handle that
  // The dashboard has better error messages and retry functionality

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-blue-50/30">
      <Header onLogout={onLogout} userRole="employee" />
      <div className="flex">
        <EmployeeNavigation activeTab={activeTab} setActiveTab={handleTabChange} userRole={userRole} onLogout={onLogout} />
        <main className="flex-1 overflow-auto min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-96px)]">
          <div className="p-4 sm:p-6 md:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

