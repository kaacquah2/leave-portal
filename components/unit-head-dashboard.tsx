/**
 * Unit Head Dashboard Component
 * MoFA Role: UNIT_HEAD (Level 2 Approval)
 * 
 * Features:
 * - Unit-level leave requests
 * - Unit staffing overview
 * - Unit leave statistics
 * - Approval queue at Level 2
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Calendar, 
  Clock, 
  Users,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { useDataStore } from '@/lib/data-store'
import { type UserRole } from '@/lib/roles'
import { apiRequest } from '@/lib/api'
import RoleQuickActions from '@/components/role-quick-actions'

interface UnitHeadDashboardProps {
  staffId?: string
  userRole: UserRole
  unit?: string | null
  onNavigate?: (tab: string) => void
}

export default function UnitHeadDashboard({ 
  staffId, 
  userRole, 
  unit,
  onNavigate 
}: UnitHeadDashboardProps) {
  const store = useDataStore({ enablePolling: true, pollingInterval: 60000, userRole })
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([])
  const [unitStats, setUnitStats] = useState({
    unitMembers: 0,
    pendingApprovals: 0,
    onLeave: 0,
    availableStaff: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [staffId, unit])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      if (!unit) {
        console.warn('Unit head dashboard: No unit provided')
        setLoading(false)
        return
      }

      // Fetch pending leave requests for unit using unit-head-specific endpoint
      // SECURITY FIX: Removed client-side filtering - API enforces server-side scoping
      try {
        const pendingResponse = await apiRequest('/api/leaves/pending/unit-head')
        if (pendingResponse.ok) {
          const data = await pendingResponse.json()
          const unitHeadLeaves = data.leaves || data || []
          // API already filters by unit - no client-side filtering needed
          setPendingLeaves(unitHeadLeaves.slice(0, 5))
        } else {
          // If unit-head-specific endpoint fails, use general endpoint with status filter
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

      // Fetch unit members from API or store
      try {
        const unitResponse = await apiRequest(`/api/staff?unit=${encodeURIComponent(unit)}`)
        let unitMembers: any[] = []
        if (unitResponse.ok) {
          unitMembers = await unitResponse.json()
        } else {
          // Fallback to store filtering
          unitMembers = store.staff.filter((s: any) => s.unit === unit && s.active)
        }

        // Fetch currently on leave from API
        const today = new Date()
        let onLeave: any[] = []
        try {
          const onLeaveResponse = await apiRequest(
            `/api/leaves?status=approved&startDate=${today.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}`
          )
          if (onLeaveResponse.ok) {
            const allApproved = await onLeaveResponse.json()
            onLeave = allApproved.filter((l: any) => {
              return new Date(l.startDate) <= today &&
                     new Date(l.endDate) >= today &&
                     l.staff?.unit === unit
            })
          } else {
            // Fallback to store
            onLeave = store.leaves.filter((l: any) => {
              return l.status === 'approved' &&
                     new Date(l.startDate) <= today &&
                     new Date(l.endDate) >= today &&
                     l.staff?.unit === unit
            })
          }
        } catch (onLeaveError) {
          console.error('Error fetching on-leave data:', onLeaveError)
          // Fallback to store
          onLeave = store.leaves.filter((l: any) => {
            return l.status === 'approved' &&
                   new Date(l.startDate) <= today &&
                   new Date(l.endDate) >= today &&
                   l.staff?.unit === unit
          })
        }
        const availableStaff = unitMembers.length - onLeave.length

        setUnitStats({
          unitMembers: unitMembers.length,
          pendingApprovals: pendingLeaves.length,
          onLeave: onLeave.length,
          availableStaff,
        })
      } catch (teamError) {
        console.error('Error fetching unit data:', teamError)
        // Use store as fallback
        const unitMembers = store.staff.filter((s: any) => s.unit === unit && s.active)
        const today = new Date()
        const onLeave = store.leaves.filter((l: any) => {
          return l.status === 'approved' &&
                 new Date(l.startDate) <= today &&
                 new Date(l.endDate) >= today &&
                 l.staff?.unit === unit
        })
        setUnitStats({
          unitMembers: unitMembers.length,
          pendingApprovals: pendingLeaves.length,
          onLeave: onLeave.length,
          availableStaff: unitMembers.length - onLeave.length,
        })
      }
    } catch (error) {
      console.error('Error fetching unit head dashboard data:', error)
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
        <h1 className="text-3xl font-bold">Unit Head Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {unit || 'Unit'} - Level 2 Approval Authority
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unit Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unitStats.unitMembers}</div>
            <p className="text-xs text-muted-foreground">Total staff in unit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{unitStats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Level 2 approval queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently on Leave</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{unitStats.onLeave}</div>
            <p className="text-xs text-muted-foreground">Staff on leave now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Staff</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{unitStats.availableStaff}</div>
            <p className="text-xs text-muted-foreground">Staff available</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals (Level 2)
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
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending leave requests in your unit</p>
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
                      <Badge variant="secondary" className="text-xs">
                        {leave.staff?.position || 'Staff'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      <span className="ml-2">({leave.days} days)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      Level 2 Pending
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

      {/* Staffing Availability Alert */}
      {unitStats.availableStaff < unitStats.unitMembers * 0.5 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Staffing Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700">
              Less than 50% of unit staff are available. Consider reviewing pending leave requests carefully.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <RoleQuickActions userRole={userRole} onAction={(action) => {
        if (onNavigate) {
          if (action === 'View Unit Calendar') {
            onNavigate('calendar')
          } else if (action.includes('Acting Officer')) {
            onNavigate('acting-appointments')
          } else if (action.includes('Approve') || action.includes('Reject')) {
            onNavigate('leave')
          }
        }
      }} />
      
      {/* Additional Actions */}
      {onNavigate && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => onNavigate('staff')}
              >
                <Users className="mr-2 h-4 w-4" />
                View Unit Members
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
                Unit Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

