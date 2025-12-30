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
import ManagerLeaveApproval from '@/components/manager-leave-approval'
import Reports from '@/components/reports'
import EmployeePortal from '@/components/employee-portal'
import UnifiedLeaveManagement from '@/components/unified-leave-management'
import HolidayCalendar from '@/components/holiday-calendar'
import LeaveTemplates from '@/components/leave-templates'
import DelegationManagement from '@/components/delegation-management'
import YearEndProcessing from '@/components/year-end-processing'
import ManagerAssignment from '@/components/manager-assignment'

import AdminPortal from '@/components/admin-portal'
import AuditorPortal from '@/components/auditor-portal'
import OrganizationalStructure from '@/components/organizational-structure'
import SupervisorDashboard from '@/components/supervisor-dashboard'
import UnitHeadDashboard from '@/components/unit-head-dashboard'
import DirectorDashboard from '@/components/director-dashboard'
import { hasPermission, type UserRole, type Permission } from '@/lib/permissions'
import { Card, CardContent } from '@/components/ui/card'
import UnauthorizedMessage from '@/components/unauthorized-message'

import { mapToMoFARole, getRoleDisplayName, isReadOnlyRole } from '@/lib/role-mapping'

interface PortalProps {
  userRole: UserRole
  onLogout: () => void
  staffId?: string // Required for employee role
}

function PortalContent({ userRole, onLogout, staffId }: PortalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('dashboard')
  const store = useDataStore({ enablePolling: true, pollingInterval: 60000, userRole }) // Poll every 60 seconds
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

  // Map role for compatibility
  const normalizedRole = mapToMoFARole(userRole)
  
  // System Admin portal has its own navigation
  if (normalizedRole === 'SYS_ADMIN' || normalizedRole === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <AdminPortal onLogout={onLogout} />
      </Suspense>
    )
  }

  // Employee portal has its own navigation
  if ((normalizedRole === 'EMPLOYEE' || normalizedRole === 'employee') && staffId) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <EmployeePortal staffId={staffId} userRole={normalizedRole} onLogout={onLogout} />
      </Suspense>
    )
  }

  // Auditor (read-only) portal
  if (isReadOnlyRole(normalizedRole)) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
        <AuditorPortal userRole={normalizedRole} onLogout={onLogout} />
      </Suspense>
    )
  }

  const renderContent = () => {
    const renderUnauthorized = (message: string, permission?: string, role?: string) => (
      <UnauthorizedMessage message={message} requiredPermission={permission} requiredRole={role} />
    )

    // Get current user's staff info if available (used for role-specific dashboards)
    const currentStaff = staffId ? store.staff?.find((s: any) => s.staffId === staffId) : null

    switch (activeTab) {
      case 'dashboard':
        // Route to role-specific dashboards for MoFA roles
        if (normalizedRole === 'SUPERVISOR' || normalizedRole === 'supervisor') {
          return <SupervisorDashboard staffId={staffId} userRole={userRole} onNavigate={setActiveTab} />
        } else if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
          return <UnitHeadDashboard staffId={staffId} userRole={userRole} unit={currentStaff?.unit || null} onNavigate={setActiveTab} />
        } else if (normalizedRole === 'DIRECTOR' || normalizedRole === 'directorate_head' || normalizedRole === 'deputy_director') {
          return <DirectorDashboard staffId={staffId} userRole={userRole} directorate={currentStaff?.directorate || null} onNavigate={setActiveTab} />
        }
        // Fallback to default dashboard for other roles
        return <Dashboard store={store} userRole={userRole} onNavigate={setActiveTab} />
      
      case 'staff':
        if (!hasPermission(userRole as UserRole, 'employee:view:all') && 
            !hasPermission(userRole as UserRole, 'employee:view:team')) {
          return renderUnauthorized(
            "You don't have permission to view staff.", 
            'employee:view:all or employee:view:team'
          )
        }
        // All supervisor/manager roles see team view
        const isManagerRole = ['SUPERVISOR', 'UNIT_HEAD', 'DIVISION_HEAD', 'DIRECTOR', 'REGIONAL_MANAGER',
          'supervisor', 'unit_head', 'division_head', 'directorate_head', 'regional_manager',
          'manager', 'deputy_director'].includes(normalizedRole)
        if (isManagerRole) {
          return <ManagerTeamView managerStaffId={staffId} />
        }
        return <StaffManagement store={store} userRole={userRole} currentStaff={currentStaff} />
      
      case 'manager-assignment':
        if (!hasPermission(userRole as UserRole, 'employee:update')) {
          return renderUnauthorized(
            "You don't have permission to assign managers.", 
            'employee:update',
            'hr'
          )
        }
        return <ManagerAssignment store={store} />
      
      case 'leave':
        if (!hasPermission(userRole as UserRole, 'leave:view:all') && 
            !hasPermission(userRole as UserRole, 'leave:view:team')) {
          return renderUnauthorized(
            "You don't have permission to view leave requests.",
            'leave:view:all or leave:view:team'
          )
        }
        // Unified component handles all roles appropriately
        return <UnifiedLeaveManagement store={store} userRole={userRole} staffId={staffId} />
      
      case 'delegation':
        if (!hasPermission(userRole as UserRole, 'leave:approve:team') && 
            !hasPermission(userRole as UserRole, 'leave:approve:all')) {
          return renderUnauthorized(
            "You don't have permission to manage delegation.",
            'leave:approve:team or leave:approve:all'
          )
        }
        return <DelegationManagement />
      
      case 'holidays':
        if (!hasPermission(userRole as UserRole, 'leave:policy:manage')) {
          return renderUnauthorized(
            "You don't have permission to manage holidays.",
            'leave:policy:manage',
            'hr'
          )
        }
        return <HolidayCalendar store={store} />
      
      case 'leave-templates':
        if (!hasPermission(userRole as UserRole, 'leave:policy:manage')) {
          return renderUnauthorized(
            "You don't have permission to manage leave templates.",
            'leave:policy:manage',
            'hr'
          )
        }
        return <LeaveTemplates store={store} />
      
      case 'year-end':
        if (!hasPermission(userRole as UserRole, 'leave:policy:manage')) {
          return renderUnauthorized(
            "You don't have permission to perform year-end processing.",
            'leave:policy:manage',
            'hr'
          )
        }
        return <YearEndProcessing />
      
      case 'reports':
        if (!hasPermission(userRole as UserRole, 'reports:hr:view') && 
            !hasPermission(userRole as UserRole, 'reports:team:view')) {
          return renderUnauthorized(
            "You don't have permission to view reports.",
            'reports:hr:view or reports:team:view'
          )
        }
        return <Reports store={store} userRole={userRole} />
      
      case 'organizational-structure':
        return (
          <OrganizationalStructure 
            userRole={userRole}
            userUnit={currentStaff?.unit || undefined}
            userDirectorate={currentStaff?.directorate || undefined}
          />
        )
      
      default:
        return <Dashboard store={store} userRole={userRole} onNavigate={setActiveTab} />
    }
  }

  const getRoleBackground = () => {
    const role = normalizedRole
    // HR roles
    if (role === 'HR_OFFICER' || role === 'HR_DIRECTOR' || role === 'hr' || role === 'hr_officer' || role === 'hr_director') {
      return 'bg-gradient-to-br from-green-50/50 via-background to-green-50/30'
    }
    // Manager/Supervisor roles
    if (role === 'SUPERVISOR' || role === 'UNIT_HEAD' || role === 'DIVISION_HEAD' || role === 'DIRECTOR' || 
        role === 'REGIONAL_MANAGER' || role === 'supervisor' || role === 'unit_head' || role === 'division_head' ||
        role === 'directorate_head' || role === 'regional_manager' || role === 'manager' || role === 'deputy_director') {
      return 'bg-gradient-to-br from-amber-50/50 via-background to-amber-50/30'
    }
    // Chief Director
    if (role === 'CHIEF_DIRECTOR' || role === 'chief_director') {
      return 'bg-gradient-to-br from-blue-50/50 via-background to-blue-50/30'
    }
    return 'bg-background'
  }

  // Type narrowing: map roles to navigation roles for Navigation component
  const getNavRole = (): 'hr' | 'manager' => {
    const role = normalizedRole
    // HR roles
    if (role === 'HR_OFFICER' || role === 'HR_DIRECTOR' || role === 'CHIEF_DIRECTOR' ||
        role === 'hr' || role === 'hr_officer' || role === 'hr_director' || role === 'chief_director') {
      return 'hr'
    }
    // All other approver roles use manager navigation
    return 'manager'
  }
  
  const navRole = getNavRole()
  
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
