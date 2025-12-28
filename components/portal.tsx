'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDataStore } from '@/lib/data-store'
import { useRealtime } from '@/lib/use-realtime'
import Header from '@/components/header'
import Navigation from '@/components/navigation'
import Dashboard from '@/components/dashboard'
import StaffManagement from '@/components/staff-management'
import ManagerTeamView from '@/components/manager-team-view'
import LeaveManagement from '@/components/leave-management'
import ManagerLeaveApproval from '@/components/manager-leave-approval'
import Reports from '@/components/reports'
import EmployeePortal from '@/components/employee-portal'
import LeavePolicyManagement from '@/components/leave-policy-management'
import HolidayCalendar from '@/components/holiday-calendar'
import LeaveCalendarView from '@/components/leave-calendar-view'
import LeaveTemplates from '@/components/leave-templates'
import DelegationManagement from '@/components/delegation-management'
import YearEndProcessing from '@/components/year-end-processing'
import ManagerAssignment from '@/components/manager-assignment'

import AdminPortal from '@/components/admin-portal'

interface PortalProps {
  userRole: 'hr' | 'hr_assistant' | 'manager' | 'deputy_director' | 'employee' | 'admin'
  onLogout: () => void
  staffId?: string // Required for employee role
}

function PortalContent({ userRole, onLogout, staffId }: PortalProps) {
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
    const handleLeavesUpdate = () => {
      store.refreshCritical()
    }

    window.addEventListener('realtime:leaves-updated', handleLeavesUpdate)

    return () => {
      window.removeEventListener('realtime:leaves-updated', handleLeavesUpdate)
    }
  }, [store])

  // Admin portal has its own navigation
  if (userRole === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <AdminPortal onLogout={onLogout} />
      </Suspense>
    )
  }

  // Employee portal has its own navigation
  if (userRole === 'employee' && staffId) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <EmployeePortal staffId={staffId} onLogout={onLogout} />
      </Suspense>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard store={store} userRole={userRole} onNavigate={setActiveTab} />
      case 'staff':
        if (userRole === 'manager' || userRole === 'deputy_director') {
          return <ManagerTeamView managerStaffId={staffId} />
        }
        return <StaffManagement store={store} userRole={userRole} />
      case 'manager-assignment':
        return <ManagerAssignment store={store} />
      case 'leave':
        if (userRole === 'manager' || userRole === 'deputy_director') {
          return <ManagerLeaveApproval />
        }
        return <LeaveManagement store={store} userRole={userRole} />
      case 'leave-calendar':
        return <LeaveCalendarView store={store} userRole={userRole} />
      case 'delegation':
        return <DelegationManagement />
      case 'leave-policies':
        return <LeavePolicyManagement store={store} />
      case 'holidays':
        return <HolidayCalendar store={store} />
      case 'leave-templates':
        return <LeaveTemplates store={store} />
      case 'year-end':
        return <YearEndProcessing />
      case 'reports':
        return <Reports store={store} userRole={userRole} />
      default:
        return <Dashboard store={store} userRole={userRole} onNavigate={setActiveTab} />
    }
  }

  const getRoleBackground = () => {
    switch (userRole) {
      case 'hr':
      case 'hr_assistant':
        return 'bg-gradient-to-br from-green-50/50 via-background to-green-50/30'
      case 'manager':
      case 'deputy_director':
        return 'bg-gradient-to-br from-amber-50/50 via-background to-amber-50/30'
      default:
        return 'bg-background'
    }
  }

  // Type narrowing: map roles to navigation roles
  const navRole = (userRole === 'hr' || userRole === 'hr_assistant') ? 'hr' : 
                  (userRole === 'manager' || userRole === 'deputy_director') ? 'manager' : 
                  userRole as 'hr' | 'manager'
  
  return (
    <div className={`min-h-screen ${getRoleBackground()}`}>
      <Header onLogout={onLogout} userRole={userRole} />
      <div className="flex">
        <Navigation activeTab={activeTab} setActiveTab={handleTabChange} userRole={navRole} onLogout={onLogout} />
        <main className="flex-1 overflow-auto min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-96px)]">
          <div className="p-4 sm:p-6 md:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function Portal(props: PortalProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PortalContent {...props} />
    </Suspense>
  )
}
