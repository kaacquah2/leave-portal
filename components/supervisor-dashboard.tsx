/**
 * Supervisor Dashboard Component
 * MoFA Role: SUPERVISOR (Level 1 Approval)
 * 
 * Features:
 * - Direct reports leave requests
 * - Pending approvals at Level 1
 * - Team leave calendar
 * - Team leave statistics
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { useDataStore } from '@/lib/data-store'
import { type UserRole } from '@/lib/roles'
import { apiRequest } from '@/lib/api'
import RoleQuickActions from '@/components/role-quick-actions'

interface SupervisorDashboardProps {
  staffId?: string
  userRole: UserRole
  onNavigate?: (tab: string) => void
}

export default function SupervisorDashboard({ 
  staffId, 
  userRole, 
  onNavigate 
}: SupervisorDashboardProps) {
  const store = useDataStore({ enablePolling: true, pollingInterval: 60000, userRole })
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([])
  const [teamStats, setTeamStats] = useState({
    totalTeamMembers: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [staffId])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      if (!staffId) {
        console.warn('Supervisor dashboard: No staffId provided')
        setLoading(false)
        return
      }

      // Fetch pending leave requests for direct reports using supervisor-specific endpoint
      // SECURITY FIX: Removed client-side filtering - API enforces server-side scoping
      try {
        const pendingResponse = await apiRequest('/api/leaves/pending/supervisor')
        if (pendingResponse.ok) {
          const data = await pendingResponse.json()
          const supervisorLeaves = data.leaves || data || []
          // API already filters by supervisor's direct reports - no client-side filtering needed
          setPendingLeaves(supervisorLeaves.slice(0, 5))
        } else {
          // If supervisor-specific endpoint fails, use general endpoint with status filter
          // API will enforce server-side role-based scoping
          const leavesResponse = await apiRequest('/api/leaves?status=pending&limit=5')
          if (leavesResponse.ok) {
            const responseData = await leavesResponse.json()
            const leaves = responseData.data || responseData || []
            // No client-side filtering - API handles scoping
            setPendingLeaves(leaves)
          }
        }
      } catch (leavesError) {
        console.error('Error fetching pending leaves:', leavesError)
      }

      // Fetch team members from API
      try {
        const teamResponse = await apiRequest(`/api/staff?supervisorId=${staffId}`)
        let teamMembers: any[] = []
        if (teamResponse.ok) {
          teamMembers = await teamResponse.json()
        } else {
          // Fallback to store filtering
          teamMembers = store.staff.filter((s: any) => {
            return s.active && (s.immediateSupervisorId === staffId || s.managerId === staffId)
          })
        }

        // Calculate statistics from API
        const thisMonth = new Date().getMonth()
        const thisYear = new Date().getFullYear()
        const monthStart = new Date(thisYear, thisMonth, 1)
        const monthEnd = new Date(thisYear, thisMonth + 1, 0)
        const teamStaffIds = teamMembers.map((m: any) => m.staffId || m.id)
        
        // Fetch approved leaves for this month from API
        let approvedLeaves: any[] = []
        try {
          const approvedResponse = await apiRequest(
            `/api/leaves?status=approved&startDate=${monthStart.toISOString().split('T')[0]}&endDate=${monthEnd.toISOString().split('T')[0]}`
          )
          if (approvedResponse.ok) {
            const allApproved = await approvedResponse.json()
            approvedLeaves = allApproved.filter((l: any) => {
              if (!teamStaffIds.includes(l.staffId)) return false
              const approvalDate = l.approvalDate ? new Date(l.approvalDate) : null
              return approvalDate && 
                     approvalDate.getMonth() === thisMonth && 
                     approvalDate.getFullYear() === thisYear
            })
          } else {
            // Fallback to store
            approvedLeaves = store.leaves.filter((l: any) => {
              if (l.status !== 'approved') return false
              if (!teamStaffIds.includes(l.staffId)) return false
              const approvalDate = l.approvalDate ? new Date(l.approvalDate) : null
              return approvalDate && 
                     approvalDate.getMonth() === thisMonth && 
                     approvalDate.getFullYear() === thisYear
            })
          }
        } catch (approvedError) {
          console.error('Error fetching approved leaves:', approvedError)
          // Fallback to store
          approvedLeaves = store.leaves.filter((l: any) => {
            if (l.status !== 'approved') return false
            if (!teamStaffIds.includes(l.staffId)) return false
            const approvalDate = l.approvalDate ? new Date(l.approvalDate) : null
            return approvalDate && 
                   approvalDate.getMonth() === thisMonth && 
                   approvalDate.getFullYear() === thisYear
          })
        }
        
        // Fetch rejected leaves for this month from API
        let rejectedLeaves: any[] = []
        try {
          const rejectedResponse = await apiRequest(
            `/api/leaves?status=rejected&startDate=${monthStart.toISOString().split('T')[0]}&endDate=${monthEnd.toISOString().split('T')[0]}`
          )
          if (rejectedResponse.ok) {
            const allRejected = await rejectedResponse.json()
            rejectedLeaves = allRejected.filter((l: any) => {
              if (!teamStaffIds.includes(l.staffId)) return false
              const rejectionDate = l.updatedAt ? new Date(l.updatedAt) : null
              return rejectionDate && 
                     rejectionDate.getMonth() === thisMonth && 
                     rejectionDate.getFullYear() === thisYear
            })
          } else {
            // Fallback to store
            rejectedLeaves = store.leaves.filter((l: any) => {
              if (l.status !== 'rejected') return false
              if (!teamStaffIds.includes(l.staffId)) return false
              const rejectionDate = l.updatedAt ? new Date(l.updatedAt) : null
              return rejectionDate && 
                     rejectionDate.getMonth() === thisMonth && 
                     rejectionDate.getFullYear() === thisYear
            })
          }
        } catch (rejectedError) {
          console.error('Error fetching rejected leaves:', rejectedError)
          // Fallback to store
          rejectedLeaves = store.leaves.filter((l: any) => {
            if (l.status !== 'rejected') return false
            if (!teamStaffIds.includes(l.staffId)) return false
            const rejectionDate = l.updatedAt ? new Date(l.updatedAt) : null
            return rejectionDate && 
                   rejectionDate.getMonth() === thisMonth && 
                   rejectionDate.getFullYear() === thisYear
          })
        }

        setTeamStats({
          totalTeamMembers: teamMembers.length,
          pendingApprovals: pendingLeaves.length,
          approvedThisMonth: approvedLeaves.length,
          rejectedThisMonth: rejectedLeaves.length,
        })
      } catch (teamError) {
        console.error('Error fetching team data:', teamError)
        // Use store as fallback
        const teamMembers = store.staff.filter((s: any) => {
          return s.active && (s.immediateSupervisorId === staffId || s.managerId === staffId)
        })
        setTeamStats({
          totalTeamMembers: teamMembers.length,
          pendingApprovals: pendingLeaves.length,
          approvedThisMonth: 0,
          rejectedThisMonth: 0,
        })
      }
    } catch (error) {
      console.error('Error fetching supervisor dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Supervisor Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Level 1 Approval Authority - Direct Reports Management
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.totalTeamMembers}</div>
            <p className="text-xs text-muted-foreground">Direct reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{teamStats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{teamStats.approvedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Leave requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected This Month</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{teamStats.rejectedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Leave requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pending Leave Approvals (Level 1)
            </CardTitle>
            {onNavigate && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onNavigate('leave')}
              >
                View All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingLeaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending leave requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{leave.staffName}</span>
                      <Badge variant="outline">{leave.leaveType}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      <span className="ml-2">({leave.days} days)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      Level 1 Pending
                    </Badge>
                    {onNavigate && (
                      <Button
                        size="sm"
                        onClick={() => onNavigate(`leave?leaveId=${leave.id}`)}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <RoleQuickActions userRole={userRole} onAction={(action) => {
        if (onNavigate) {
          if (action === 'View Team Calendar') {
            onNavigate('calendar')
          } else if (action.includes('Approve') || action.includes('Reject')) {
            onNavigate('leave')
          }
        }
      }} />
      
      {/* Legacy Quick Actions (if needed) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Additional Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {onNavigate && (
              <>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => onNavigate('staff')}
                >
                  <Users className="mr-2 h-4 w-4" />
                  View Team Members
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => onNavigate('leave')}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Approve Leave Requests
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => onNavigate('reports')}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Team Reports
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Level 1 Approval</p>
                  <p className="text-muted-foreground text-xs">
                    Review direct reports' leave requests before they proceed to Unit Head
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Check Staffing Impact</p>
                  <p className="text-muted-foreground text-xs">
                    Ensure adequate coverage before approving
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

