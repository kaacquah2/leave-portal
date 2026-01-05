/**
 * Chief Director Dashboard Component
 * MoFA Role: CHIEF_DIRECTOR (Executive Authority)
 * 
 * Features:
 * - Executive oversight and approval
 * - View-only access to most functions
 * - Approve Directors & HR Director leaves
 * - System-wide reports and analytics
 * - Audit log access
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
  TrendingUp,
  Shield,
  Eye,
  AlertCircle
} from 'lucide-react'
import { useDataStore } from '@/lib/data-store'
import { type UserRole } from '@/lib/roles'
import { apiRequest } from '@/lib/api'

interface ChiefDirectorDashboardProps {
  staffId?: string
  userRole: UserRole
  onNavigate?: (tab: string) => void
}

export default function ChiefDirectorDashboard({ 
  staffId, 
  userRole, 
  onNavigate 
}: ChiefDirectorDashboardProps) {
  const store = useDataStore({ enablePolling: true, pollingInterval: 60000, userRole })
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([])
  const [executiveStats, setExecutiveStats] = useState({
    totalStaff: 0,
    pendingSeniorApprovals: 0,
    approvedThisMonth: 0,
    onLeave: 0,
    directorates: 0,
    units: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [staffId])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch pending leave requests for Directors and HR Director
      const leavesResponse = await apiRequest('/api/leaves?status=pending')
      if (leavesResponse.ok) {
        const allLeaves = await leavesResponse.json()
        // Chief Director approves Directors and HR Director leaves
        const seniorStaffLeaves = allLeaves.filter((leave: any) => {
          if (leave.status !== 'pending') return false
          // Check if the staff member is a Director or HR Director
          const staffRole = leave.staff?.position || ''
          const isDirector = staffRole.toLowerCase().includes('director') || 
                           leave.staff?.grade?.includes('Director')
          const isHRDirector = leave.staff?.position?.toLowerCase().includes('hr director')
          return isDirector || isHRDirector
        })
        setPendingLeaves(seniorStaffLeaves.slice(0, 5))
      }

      // Fetch staff statistics from API
      try {
        const staffResponse = await apiRequest('/api/staff')
        let totalStaff = 0
        let uniqueDirectorates = new Set<string>()
        let uniqueUnits = new Set<string>()
        
        if (staffResponse.ok) {
          const allStaff = await staffResponse.json()
          totalStaff = allStaff.filter((s: any) => s.active).length
          allStaff.forEach((s: any) => {
            if (s.directorate) uniqueDirectorates.add(s.directorate)
            if (s.unit) uniqueUnits.add(s.unit)
          })
        } else {
          // Fallback to store
          totalStaff = store.staff.filter((s: any) => s.active).length
          store.staff.forEach((s: any) => {
            if (s.directorate) uniqueDirectorates.add(s.directorate)
            if (s.unit) uniqueUnits.add(s.unit)
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

            setExecutiveStats({
              totalStaff,
              pendingSeniorApprovals: pendingLeaves.length,
              approvedThisMonth: approvedLeaves.length,
              onLeave: onLeave.length,
              directorates: uniqueDirectorates.size,
              units: uniqueUnits.size,
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
            setExecutiveStats({
              totalStaff,
              pendingSeniorApprovals: pendingLeaves.length,
              approvedThisMonth: approvedLeaves.length,
              onLeave: onLeave.length,
              directorates: uniqueDirectorates.size,
              units: uniqueUnits.size,
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
          setExecutiveStats({
            totalStaff,
            pendingSeniorApprovals: pendingLeaves.length,
            approvedThisMonth: approvedLeaves.length,
            onLeave: onLeave.length,
            directorates: uniqueDirectorates.size,
            units: uniqueUnits.size,
          })
        }
      } catch (staffError) {
        console.error('Error fetching staff data:', staffError)
        // Use store fallback
        const totalStaff = store.staff.filter((s: any) => s.active).length
        const uniqueDirectorates = new Set(store.staff.map((s: any) => s.directorate).filter(Boolean))
        const uniqueUnits = new Set(store.staff.map((s: any) => s.unit).filter(Boolean))
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
        setExecutiveStats({
          totalStaff,
          pendingSeniorApprovals: pendingLeaves.length,
          approvedThisMonth: approvedLeaves.length,
          onLeave: onLeave.length,
          directorates: uniqueDirectorates.size,
          units: uniqueUnits.size,
        })
      }
    } catch (error) {
      console.error('Error fetching chief director dashboard data:', error)
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
        <h1 className="text-3xl font-bold">Chief Director Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Executive Authority - Ministerial Oversight
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executiveStats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">Organization-wide</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Senior Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{executiveStats.pendingSeniorApprovals}</div>
            <p className="text-xs text-muted-foreground">Directors & HR Director</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Directorates</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{executiveStats.directorates}</div>
            <p className="text-xs text-muted-foreground">{executiveStats.units} units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{executiveStats.approvedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Leave requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{executiveStats.onLeave}</div>
            <p className="text-xs text-muted-foreground">Currently</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Senior Approvals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Pending Senior Staff Approvals
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
              <p>No pending leave requests from Directors or HR Director</p>
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
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Senior Staff
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      <span className="ml-2">({leave.days} days)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      Executive Approval
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
                  <Eye className="mr-2 h-4 w-4" />
                  View All Staff
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => onNavigate('leave')}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Approve Senior Staff Leaves
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => onNavigate('reports')}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  System Reports & Analytics
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => onNavigate('organizational-structure')}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  View Organizational Structure
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
                <Shield className="h-4 w-4 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Executive Authority</p>
                  <p className="text-muted-foreground text-xs">
                    Final approval for Directors and HR Director leave requests
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Eye className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">View-Only Access</p>
                  <p className="text-muted-foreground text-xs">
                    View all staff, leaves, and reports (cannot create or edit)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">System Audit Access</p>
                  <p className="text-muted-foreground text-xs">
                    View audit logs and system reports for compliance oversight
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Cannot Manage Policies</p>
                  <p className="text-muted-foreground text-xs">
                    Leave policy management is restricted to HR Officer/HR Director
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

