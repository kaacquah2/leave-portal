'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import LeaveManagement from '@/components/leave-management'
import LeaveCalendarView from '@/components/leave-calendar-view'
import LeavePolicyManagement from '@/components/leave-policy-management'

import type { UserRole } from '@/lib/permissions'

interface UnifiedLeaveManagementProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  userRole: UserRole
  staffId?: string
}

export default function UnifiedLeaveManagement({ store, userRole, staffId }: UnifiedLeaveManagementProps) {
  // Normalize role for checks (handle both new and legacy role codes)
  const normalizedRole = userRole?.toUpperCase() === 'SUPERVISOR' ? 'SUPERVISOR' : 
                         userRole?.toLowerCase() === 'supervisor' ? 'supervisor' : userRole

  // Determine which tabs to show based on role
  // Include all manager/supervisor roles
  const isHRRole = userRole === 'hr' || userRole === 'hr_assistant' || userRole === 'HR_OFFICER' || userRole === 'HR_DIRECTOR'
  const isManagerRole = userRole === 'manager' || userRole === 'deputy_director' || 
                        normalizedRole === 'SUPERVISOR' || normalizedRole === 'supervisor' ||
                        userRole === 'UNIT_HEAD' || userRole === 'DIVISION_HEAD' || 
                        userRole === 'DIRECTOR' || userRole === 'REGIONAL_MANAGER' ||
                        userRole === 'unit_head' || userRole === 'division_head' ||
                        userRole === 'directorate_head' || userRole === 'regional_manager'
  
  const showManagement = isHRRole || isManagerRole
  const showCalendar = isHRRole || isManagerRole
  const showPolicies = isHRRole // Only HR can manage policies

  // Determine if this is an approver role (shows "Approve Leaves" instead of "Leave Management")
  const isApproverRole = isManagerRole && !isHRRole

  // Set initial active tab based on what's available
  const getInitialTab = () => {
    if (showManagement) return 'management'
    if (showCalendar) return 'calendar'
    if (showPolicies) return 'policies'
    return 'management' // Fallback
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  return (
    <div className="space-y-6">
      <div className="px-8 pt-8">
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground mt-1">
          {isHRRole
            ? 'Manage leave requests, view calendar, and configure policies'
            : isApproverRole
            ? 'Review and approve leave requests, view calendar'
            : 'View and manage your leave requests'}
        </p>
      </div>

      <div className="px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${showPolicies ? 'grid-cols-3' : showManagement && showCalendar ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {showManagement && (
              <TabsTrigger value="management">
                {isApproverRole ? 'Approve Leaves' : 'Leave Management'}
              </TabsTrigger>
            )}
            {showCalendar && (
              <TabsTrigger value="calendar">Leave Calendar</TabsTrigger>
            )}
            {showPolicies && (
              <TabsTrigger value="policies">Leave Policies</TabsTrigger>
            )}
          </TabsList>

          {showManagement && (
            <TabsContent value="management" className="mt-6">
              <div className="-mx-8">
                <LeaveManagement store={store} userRole={userRole} />
              </div>
            </TabsContent>
          )}

          {showCalendar && (
            <TabsContent value="calendar" className="mt-6">
              <div className="-mx-8">
                <LeaveCalendarView store={store} userRole={userRole as 'hr' | 'hr_assistant' | 'manager' | 'deputy_director' | 'employee'} staffId={staffId} />
              </div>
            </TabsContent>
          )}

          {showPolicies && (
            <TabsContent value="policies" className="mt-6">
              <div className="-mx-8">
                <LeavePolicyManagement store={store} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

