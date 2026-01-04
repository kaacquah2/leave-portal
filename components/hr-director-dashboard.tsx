/**
 * HR Director Dashboard Component
 * MoFA Role: HR_DIRECTOR (Senior HR Authority)
 * 
 * Features:
 * - Strategic HR oversight
 * - Staff creation and management
 * - Organizational structure management
 * - System audit access
 * - Performance review authority
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
  FileText,
  Settings,
  TrendingUp,
  Building2,
  Shield,
  AlertCircle
} from 'lucide-react'
import { useDataStore } from '@/lib/data-store'
import { type UserRole } from '@/lib/permissions'
import { apiRequest } from '@/lib/api-config'

interface HRDirectorDashboardProps {
  staffId?: string
  userRole: UserRole
  onNavigate?: (tab: string) => void
}

export default function HRDirectorDashboard({ 
  staffId, 
  userRole, 
  onNavigate 
}: HRDirectorDashboardProps) {
  const store = useDataStore({ enablePolling: true, pollingInterval: 60000, userRole })
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([])
  const [hrStats, setHrStats] = useState({
    totalStaff: 0,
    pendingApprovals: 0,
    approvedThisMonth: 0,
    policiesActive: 0,
    onLeave: 0,
    units: 0,
    directorates: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [staffId])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch pending leave requests (including senior staff) from API
      let pendingLeavesList: any[] = []
      try {
        const leavesResponse = await apiRequest('/api/leaves?status=pending')
        if (leavesResponse.ok) {
          const allLeaves = await leavesResponse.json()
          // HR Director can approve all, including senior staff/director leaves
          pendingLeavesList = allLeaves.filter((leave: any) => leave.status === 'pending')
          setPendingLeaves(pendingLeavesList.slice(0, 5))
        }
      } catch (leavesError) {
        console.error('Error fetching pending leaves:', leavesError)
      }

      // Fetch staff statistics from API
      try {
        const staffResponse = await apiRequest('/api/staff')
        let totalStaff = 0
        let uniqueUnits = new Set<string>()
        let uniqueDirectorates = new Set<string>()
        
        if (staffResponse.ok) {
          const allStaff = await staffResponse.json()
          totalStaff = allStaff.filter((s: any) => s.active).length
          allStaff.forEach((s: any) => {
            if (s.unit) uniqueUnits.add(s.unit)
            if (s.directorate) uniqueDirectorates.add(s.directorate)
          })
        } else {
          // Fallback to store
          totalStaff = store.staff.filter((s: any) => s.active).length
          store.staff.forEach((s: any) => {
            if (s.unit) uniqueUnits.add(s.unit)
            if (s.directorate) uniqueDirectorates.add(s.directorate)
          })
        }

        // Fetch approved leaves for this month from API
        const thisMonth = new Date().getMonth()
        const thisYear = new Date().getFullYear()
        const monthStart = new Date(thisYear, thisMonth, 1)
        const monthEnd = new Date(thisYear, thisMonth + 1, 0)
        
        try {
          const approvedResponse = await apiRequest(
            `/api/leaves?status=approved&startDate=${monthStart.toISOString().split('T')[0]}&endDate=${monthEnd.toISOString().split('T')[0]}`
          )
          let approvedLeaves: any[] = []
          if (approvedResponse.ok) {
            approvedLeaves = await approvedResponse.json()
            approvedLeaves = approvedLeaves.filter((l: any) => {
              const approvalDate = l.approvalDate ? new Date(l.approvalDate) : null
              return approvalDate && 
                     approvalDate.getMonth() === thisMonth && 
                     approvalDate.getFullYear() === thisYear
            })
          } else {
            // Fallback to store
            approvedLeaves = store.leaves.filter((l: any) => {
              if (l.status !== 'approved') return false
              const approvalDate = l.approvalDate ? new Date(l.approvalDate) : null
              return approvalDate && 
                     approvalDate.getMonth() === thisMonth && 
                     approvalDate.getFullYear() === thisYear
            })
          }

          // Fetch currently on leave from API
          const today = new Date()
          try {
            const onLeaveResponse = await apiRequest(
              `/api/leaves?status=approved&startDate=${today.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}`
            )
            let onLeave: any[] = []
            if (onLeaveResponse.ok) {
              const allApproved = await onLeaveResponse.json()
              onLeave = allApproved.filter((l: any) => {
                return new Date(l.startDate) <= today &&
                       new Date(l.endDate) >= today
              })
            } else {
              // Fallback to store
              onLeave = store.leaves.filter((l: any) => {
                return l.status === 'approved' &&
                       new Date(l.startDate) <= today &&
                       new Date(l.endDate) >= today
              })
            }

            // Fetch leave policies count
            let policiesActive = 0
            try {
              const policiesResponse = await apiRequest('/api/leave-policies')
              if (policiesResponse.ok) {
                const policies = await policiesResponse.json()
                policiesActive = Array.isArray(policies) ? policies.length : 0
              } else {
                policiesActive = store.leavePolicies?.length || 0
              }
            } catch (policiesError) {
              policiesActive = store.leavePolicies?.length || 0
            }

            setHrStats({
              totalStaff,
              pendingApprovals: pendingLeavesList.length,
              approvedThisMonth: approvedLeaves.length,
              policiesActive,
              onLeave: onLeave.length,
              units: uniqueUnits.size,
              directorates: uniqueDirectorates.size,
            })
          } catch (onLeaveError) {
            console.error('Error fetching on-leave data:', onLeaveError)
            // Use store fallback
            const today = new Date()
            const onLeave = store.leaves.filter((l: any) => {
              return l.status === 'approved' &&
                     new Date(l.startDate) <= today &&
                     new Date(l.endDate) >= today
            })
            setHrStats({
              totalStaff,
              pendingApprovals: pendingLeavesList.length,
              approvedThisMonth: approvedLeaves.length,
              policiesActive: store.leavePolicies?.length || 0,
              onLeave: onLeave.length,
              units: uniqueUnits.size,
              directorates: uniqueDirectorates.size,
            })
          }
        } catch (approvedError) {
          console.error('Error fetching approved leaves:', approvedError)
          // Use store fallback
          const thisMonth = new Date().getMonth()
          const thisYear = new Date().getFullYear()
          const approvedLeaves = store.leaves.filter((l: any) => {
            if (l.status !== 'approved') return false
            const approvalDate = l.approvalDate ? new Date(l.approvalDate) : null
            return approvalDate && 
                   approvalDate.getMonth() === thisMonth && 
                   approvalDate.getFullYear() === thisYear
          })
          const today = new Date()
          const onLeave = store.leaves.filter((l: any) => {
            return l.status === 'approved' &&
                   new Date(l.startDate) <= today &&
                   new Date(l.endDate) >= today
          })
          setHrStats({
            totalStaff,
            pendingApprovals: pendingLeavesList.length,
            approvedThisMonth: approvedLeaves.length,
            policiesActive: store.leavePolicies?.length || 0,
            onLeave: onLeave.length,
            units: uniqueUnits.size,
            directorates: uniqueDirectorates.size,
          })
        }
      } catch (staffError) {
        console.error('Error fetching staff data:', staffError)
        // Use store fallback
        const totalStaff = store.staff.filter((s: any) => s.active).length
        const uniqueUnits = new Set(store.staff.map((s: any) => s.unit).filter(Boolean))
        const uniqueDirectorates = new Set(store.staff.map((s: any) => s.directorate).filter(Boolean))
        const thisMonth = new Date().getMonth()
        const thisYear = new Date().getFullYear()
        const approvedLeaves = store.leaves.filter((l: any) => {
          if (l.status !== 'approved') return false
          const approvalDate = l.approvalDate ? new Date(l.approvalDate) : null
          return approvalDate && 
                 approvalDate.getMonth() === thisMonth && 
                 approvalDate.getFullYear() === thisYear
        })
        const today = new Date()
        const onLeave = store.leaves.filter((l: any) => {
          return l.status === 'approved' &&
                 new Date(l.startDate) <= today &&
                 new Date(l.endDate) >= today
        })
        setHrStats({
          totalStaff,
          pendingApprovals: pendingLeavesList.length,
          approvedThisMonth: approvedLeaves.length,
          policiesActive: store.leavePolicies?.length || 0,
          onLeave: onLeave.length,
          units: uniqueUnits.size,
          directorates: uniqueDirectorates.size,
        })
      }
    } catch (error) {
      console.error('Error fetching HR director dashboard data:', error)
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
        <h1 className="text-3xl font-bold">HR Director Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Senior HR Authority - Strategic HR Management
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hrStats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{hrStats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Including senior staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizational Units</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{hrStats.units}</div>
            <p className="text-xs text-muted-foreground">{hrStats.directorates} directorates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{hrStats.approvedThisMonth}</div>
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
              Pending Approvals (All Levels)
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
                      {leave.staff?.directorate && (
                        <Badge variant="secondary" className="text-xs">
                          {leave.staff.directorate}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      <span className="ml-2">({leave.days} days)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      HR Director Review
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
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
                  Staff Management
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
                  onClick={() => onNavigate('organizational-structure')}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Manage Organizational Structure
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => onNavigate('reports')}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  System Reports & Analytics
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Strategic HR Authority</p>
                  <p className="text-muted-foreground text-xs">
                    Create staff, manage organizational structure, approve senior staff leaves
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Full HR Access</p>
                  <p className="text-muted-foreground text-xs">
                    All HR Officer capabilities plus staff creation and org management
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">System Audit Access</p>
                  <p className="text-muted-foreground text-xs">
                    View audit logs and system reports for compliance
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Performance Review</p>
                  <p className="text-muted-foreground text-xs">
                    Conduct performance reviews for all staff
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

