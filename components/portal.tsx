'use client'

import { useState } from 'react'
import { useDataStore } from '@/lib/data-store'
import Header from '@/components/header'
import Navigation from '@/components/navigation'
import Dashboard from '@/components/dashboard'
import StaffManagement from '@/components/staff-management'
import LeaveManagement from '@/components/leave-management'
import Reports from '@/components/reports'
import EmployeePortal from '@/components/employee-portal'
import LeavePolicyManagement from '@/components/leave-policy-management'
import HolidayCalendar from '@/components/holiday-calendar'
import LeaveCalendarView from '@/components/leave-calendar-view'
import LeaveTemplates from '@/components/leave-templates'

interface PortalProps {
  userRole: 'hr' | 'manager' | 'employee'
  onLogout: () => void
  staffId?: string // Required for employee role
}

export default function Portal({ userRole, onLogout, staffId }: PortalProps) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const store = useDataStore()

  // Employee portal has its own navigation
  if (userRole === 'employee' && staffId) {
    return <EmployeePortal staffId={staffId} onLogout={onLogout} />
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard store={store} userRole={userRole} onNavigate={setActiveTab} />
      case 'staff':
        return <StaffManagement store={store} userRole={userRole} />
      case 'leave':
        return <LeaveManagement store={store} userRole={userRole} />
      case 'leave-calendar':
        return <LeaveCalendarView store={store} userRole={userRole} />
      case 'leave-policies':
        return <LeavePolicyManagement store={store} />
      case 'holidays':
        return <HolidayCalendar store={store} />
      case 'leave-templates':
        return <LeaveTemplates store={store} />
      case 'reports':
        return <Reports store={store} userRole={userRole} />
      default:
        return <Dashboard store={store} userRole={userRole} onNavigate={setActiveTab} />
    }
  }

  const getRoleBackground = () => {
    switch (userRole) {
      case 'hr':
        return 'bg-gradient-to-br from-green-50/50 via-background to-green-50/30'
      case 'manager':
        return 'bg-gradient-to-br from-amber-50/50 via-background to-amber-50/30'
      default:
        return 'bg-background'
    }
  }

  return (
    <div className={`min-h-screen ${getRoleBackground()}`}>
      <Header onLogout={onLogout} userRole={userRole} />
      <div className="flex">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
