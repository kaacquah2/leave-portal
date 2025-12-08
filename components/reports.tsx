'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ReturnType } from '@/lib/data-store'

interface ReportsProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  userRole: string
}

export default function Reports({ store, userRole }: ReportsProps) {
  const getRoleTheme = () => {
    switch (userRole) {
      case 'hr':
        return {
          gradient: 'from-green-50 to-background',
          accent: 'text-green-600',
          border: 'border-green-200',
        }
      default:
        return {
          gradient: 'from-background to-background',
          accent: 'text-primary',
          border: 'border-border',
        }
    }
  }

  const theme = getRoleTheme()

  // Calculate statistics
  const stats = {
    totalStaff: store.staff.length,
    activeStaff: store.staff.filter(s => s.active).length,
    totalLeaves: store.leaves.length,
    approvedLeaves: store.leaves.filter(l => l.status === 'approved').length,
    pendingLeaves: store.leaves.filter(l => l.status === 'pending').length,
    rejectedLeaves: store.leaves.filter(l => l.status === 'rejected').length,
  }

  // Group by department
  const byDepartment = store.staff.reduce((acc, staff) => {
    if (!acc[staff.department]) {
      acc[staff.department] = 0
    }
    acc[staff.department]++
    return acc
  }, {} as Record<string, number>)

  // Leave by type
  const byLeaveType = store.leaves.reduce((acc, leave) => {
    if (!acc[leave.leaveType]) {
      acc[leave.leaveType] = 0
    }
    acc[leave.leaveType]++
    return acc
  }, {} as Record<string, number>)

  const getTitle = () => {
    return 'Reports'
  }

  const getSubtitle = () => {
    return 'Staff and leave statistics and reports'
  }

  return (
    <div className={`p-8 space-y-6 bg-gradient-to-b ${theme.gradient}`}>
      <div>
        <h1 className="text-3xl font-bold">{getTitle()}</h1>
        <p className="text-muted-foreground">{getSubtitle()}</p>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${theme.accent}`}>{stats.totalStaff}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeStaff} active</p>
          </CardContent>
        </Card>
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leaves</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${theme.accent}`}>{stats.totalLeaves}</p>
          </CardContent>
        </Card>
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.approvedLeaves}</p>
          </CardContent>
        </Card>
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingLeaves}</p>
          </CardContent>
        </Card>
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.rejectedLeaves}</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader>
            <CardTitle>Staff by Department</CardTitle>
            <CardDescription>Distribution across departments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byDepartment).map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between">
                <span className="text-sm">{dept}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={`border-2 ${theme.border}`}>
          <CardHeader>
            <CardTitle>Leaves by Type</CardTitle>
            <CardDescription>Distribution of leave requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byLeaveType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm">{type}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
