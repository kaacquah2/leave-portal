/**
 * Director Dashboard Component
 * MoFA Role: DIRECTOR (Level 4 Approval)
 * 
 * Features:
 * - Directorate-level leave overview
 * - Directorate staffing analytics
 * - Escalation management
 * - Directorate reports
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
  AlertTriangle,
  BarChart3
} from 'lucide-react'
import { useDataStore } from '@/lib/data-store'
import { type UserRole } from '@/lib/permissions'
import { apiRequest } from '@/lib/api-config'

interface DirectorDashboardProps {
  staffId?: string
  userRole: UserRole
  directorate?: string | null
  onNavigate?: (tab: string) => void
}

export default function DirectorDashboard({ 
  staffId, 
  userRole, 
  directorate,
  onNavigate 
}: DirectorDashboardProps) {
  const store = useDataStore({ enablePolling: true, pollingInterval: 60000, userRole })
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([])
  const [directorateStats, setDirectorateStats] = useState({
    totalStaff: 0,
    pendingApprovals: 0,
    onLeave: 0,
    units: 0,
    escalationCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for store to be initialized (staff array exists, even if empty)
    if (store.staff !== undefined) {
      if (directorate) {
        fetchDashboardData()
      } else if (!directorate && staffId) {
        // If directorate is not set, try to fetch it from API
        fetchDirectorateInfo()
      } else {
        // No directorate and no staffId - show error state
        setLoading(false)
      }
    }
  }, [staffId, directorate, store.staff, store.leaves])

  const fetchDirectorateInfo = async () => {
    try {
      if (!staffId) {
        setLoading(false)
        return
      }
      
      const response = await apiRequest(`/api/staff/${staffId}`)
      if (response.ok) {
        const staffData = await response.json()
        if (staffData.directorate) {
          // Store has the data, just need to wait for next render
          // The useEffect will trigger again when directorate prop updates
          console.log('Directorate found:', staffData.directorate)
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching directorate info:', error)
      setLoading(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // If no directorate, we can't show meaningful data
      if (!directorate) {
        console.warn('Director dashboard: No directorate set for director')
        setLoading(false)
        return
      }

      // Fetch pending leave requests for directorate
      const leavesResponse = await apiRequest('/api/leaves?status=pending')
      let directorateLeaves: any[] = []
      if (leavesResponse.ok) {
        const allLeaves = await leavesResponse.json()
        directorateLeaves = allLeaves.filter((leave: any) => {
          return leave.status === 'pending' && 
                 leave.staff?.directorate === directorate
        })
        setPendingLeaves(directorateLeaves.slice(0, 5))
      }

      // Calculate directorate statistics from store
      // Ensure store has data
      if (!store.staff || store.staff.length === 0) {
        console.warn('Director dashboard: Store staff data not loaded yet')
        // Try to refresh the store
        store.refreshCritical()
        setLoading(false)
        return
      }

      const directorateStaff = store.staff.filter((s: any) => 
        s.directorate === directorate && s.active
      )
      
      const uniqueUnits = new Set(
        directorateStaff.map((s: any) => s.unit).filter(Boolean)
      )
      
      const onLeave = (store.leaves || []).filter((l: any) => {
        const today = new Date()
        return l.status === 'approved' &&
               new Date(l.startDate) <= today &&
               new Date(l.endDate) >= today &&
               l.staff?.directorate === directorate
      })
      
      // Count escalations (leaves pending > 3 days)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const escalations = directorateLeaves.filter((l: any) => {
        const createdDate = l.createdAt ? new Date(l.createdAt) : null
        return createdDate && createdDate < threeDaysAgo
      })

      setDirectorateStats({
        totalStaff: directorateStaff.length,
        pendingApprovals: directorateLeaves.length,
        onLeave: onLeave.length,
        units: uniqueUnits.size,
        escalationCount: escalations.length,
      })
    } catch (error) {
      console.error('Error fetching director dashboard data:', error)
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

  // Show warning if no directorate is set
  if (!directorate) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Director Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Level 4 Approval Authority
          </p>
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Directorate Not Set
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-2">
              Your staff record does not have a directorate assigned. Please contact HR to update your directorate information.
            </p>
            <p className="text-xs text-amber-600">
              Once your directorate is set, you will be able to view directorate-level statistics and manage approvals.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Director Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {directorate} - Level 4 Approval Authority
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
            <div className="text-2xl font-bold">{directorateStats.totalStaff}</div>
            <p className="text-xs text-muted-foreground">Directorate staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{directorateStats.units}</div>
            <p className="text-xs text-muted-foreground">Functional units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{directorateStats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Level 4 queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{directorateStats.onLeave}</div>
            <p className="text-xs text-muted-foreground">Currently</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{directorateStats.escalationCount}</div>
            <p className="text-xs text-muted-foreground">&gt; 3 days pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Escalations Alert */}
      {directorateStats.escalationCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Escalations Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-2">
              {directorateStats.escalationCount} leave request(s) have been pending for more than 3 days.
            </p>
            {onNavigate && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onNavigate('leave?filter=escalated')}
              >
                Review Escalations
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals (Level 4)
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
              <p>No pending leave requests in your directorate</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((leave) => {
                const daysPending = Math.floor(
                  (new Date().getTime() - new Date(leave.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                )
                const isEscalated = daysPending > 3
                
                return (
                  <div
                    key={leave.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors ${
                      isEscalated ? 'border-red-200 bg-red-50' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{leave.staffName}</span>
                        <Badge variant="outline">{leave.leaveType}</Badge>
                        <Badge variant="secondary" className="text-xs">
                          {leave.staff?.unit || 'Unit'}
                        </Badge>
                        {isEscalated && (
                          <Badge variant="destructive" className="text-xs">
                            Escalated ({daysPending} days)
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        <span className="ml-2">({leave.days} days)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        Level 4 Pending
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
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
                View Directorate Staff
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
                <BarChart3 className="mr-2 h-4 w-4" />
                Directorate Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

