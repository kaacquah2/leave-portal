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

interface EmployeePortalProps {
  staffId: string
  onLogout: () => void
}

export default function EmployeePortal({ staffId, onLogout }: EmployeePortalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('dashboard')
  const store = useDataStore({ enablePolling: true, pollingInterval: 60000 }) // Poll every 60 seconds
  const { connected } = useRealtime(true) // Enable real-time updates

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
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <EmployeeDashboard store={store} staffId={staffId} onNavigate={handleTabChange} />
      case 'apply-leave':
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
        return <EmployeeLeaveBalances store={store} staffId={staffId} />
      case 'leave-history':
        return <EmployeeLeaveHistory store={store} staffId={staffId} />
      case 'notifications':
        return <NotificationCenter />
      case 'profile':
        return <EmployeeProfileView store={store} staffId={staffId} />
      case 'documents':
        return <EmployeeDocuments />
      default:
        return <EmployeeDashboard store={store} staffId={staffId} onNavigate={handleTabChange} />
    }
  }

  if (!currentStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Staff member not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-background to-blue-50/30">
      <Header onLogout={onLogout} userRole="employee" />
      <div className="flex">
        <EmployeeNavigation activeTab={activeTab} setActiveTab={handleTabChange} onLogout={onLogout} />
        <main className="flex-1 overflow-auto min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-96px)]">
          <div className="p-4 sm:p-6 md:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

