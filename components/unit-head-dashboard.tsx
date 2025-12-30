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
import { type UserRole } from '@/lib/permissions'
import { apiRequest } from '@/lib/api-config'

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
      
      // Fetch pending leave requests for unit
      const leavesResponse = await apiRequest('/api/leaves?status=pending')
      if (leavesResponse.ok) {
        const allLeaves = await leavesResponse.json()
        // Filter for unit staff (enhanced with actual unit filtering)
        const unitLeaves = allLeaves.filter((leave: any) => {
          return leave.status === 'pending' && 
                 leave.staff?.unit === unit
        })
        setPendingLeaves(unitLeaves.slice(0, 5))
      }

      // Calculate unit statistics
      const unitMembers = store.staff.filter((s: any) => s.unit === unit && s.active)
      const onLeave = store.leaves.filter((l: any) => {
        const today = new Date()
        return l.status === 'approved' &&
               new Date(l.startDate) <= today &&
               new Date(l.endDate) >= today &&
               l.staff?.unit === unit
      })
      const availableStaff = unitMembers.length - onLeave.length

      setUnitStats({
        unitMembers: unitMembers.length,
        pendingApprovals: pendingLeaves.length,
        onLeave: onLeave.length,
        availableStaff,
      })
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

