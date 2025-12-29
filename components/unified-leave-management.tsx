'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import LeaveManagement from '@/components/leave-management'
import LeaveCalendarView from '@/components/leave-calendar-view'
import LeavePolicyManagement from '@/components/leave-policy-management'

interface UnifiedLeaveManagementProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  userRole: 'hr' | 'hr_assistant' | 'manager' | 'deputy_director' | 'employee'
  staffId?: string
}

export default function UnifiedLeaveManagement({ store, userRole, staffId }: UnifiedLeaveManagementProps) {
  const [activeTab, setActiveTab] = useState('management')

  // Determine which tabs to show based on role
  const showManagement = userRole === 'hr' || userRole === 'hr_assistant' || userRole === 'manager' || userRole === 'deputy_director'
  const showCalendar = userRole === 'hr' || userRole === 'hr_assistant' || userRole === 'manager' || userRole === 'deputy_director'
  const showPolicies = userRole === 'hr' // Only HR can manage policies

  return (
    <div className="space-y-6">
      <div className="px-8 pt-8">
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground mt-1">
          {userRole === 'hr' || userRole === 'hr_assistant' 
            ? 'Manage leave requests, view calendar, and configure policies'
            : userRole === 'manager' || userRole === 'deputy_director'
            ? 'Review and approve leave requests, view calendar'
            : 'View and manage your leave requests'}
        </p>
      </div>

      <div className="px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${showPolicies ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {showManagement && (
              <TabsTrigger value="management">
                {userRole === 'manager' || userRole === 'deputy_director' ? 'Approve Leaves' : 'Leave Management'}
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
                <LeaveCalendarView store={store} userRole={userRole} staffId={staffId} />
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

