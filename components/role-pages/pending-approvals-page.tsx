/**
 * Pending Approvals Page Component
 * Used by: Supervisor, Unit Head, HoD, Director, HR Director, Chief Director
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText,
  Calendar,
  User,
  Building2
} from 'lucide-react'
import { apiRequest } from '@/lib/api'
import { type UserRole, PermissionChecks } from '@/lib/roles'

interface PendingApprovalsPageProps {
  userRole: UserRole
  apiEndpoint: string
  title: string
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onView?: (id: string) => void
}

export default function PendingApprovalsPage({
  userRole,
  apiEndpoint,
  title,
  onApprove,
  onReject,
  onView,
}: PendingApprovalsPageProps) {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Permission checks for approve/reject buttons
  const canApprove = PermissionChecks.canApproveLeaveAll(userRole) || 
                    PermissionChecks.canApproveLeaveTeam(userRole)

  useEffect(() => {
    fetchPendingApprovals()
  }, [apiEndpoint])

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiRequest(apiEndpoint)
      if (response.ok) {
        const data = await response.json()
        setLeaves(data.leaves || data || [])
      } else {
        setError('Failed to fetch pending approvals')
      }
    } catch (err) {
      console.error('Error fetching pending approvals:', err)
      setError('An error occurred while fetching pending approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    if (onApprove) {
      onApprove(id)
    } else {
      // Default approve action
      try {
        const response = await apiRequest(`/api/leaves/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'approve' }),
        })
        if (response.ok) {
          fetchPendingApprovals()
        }
      } catch (err) {
        console.error('Error approving leave:', err)
      }
    }
  }

  const handleReject = async (id: string) => {
    if (onReject) {
      onReject(id)
    } else {
      // Default reject action
      try {
        const response = await apiRequest(`/api/leaves/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'reject' }),
        })
        if (response.ok) {
          fetchPendingApprovals()
        }
      } catch (err) {
        console.error('Error rejecting leave:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Button onClick={fetchPendingApprovals} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {leaves.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              No pending approvals at this time
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {leaves.map((leave) => (
            <Card key={leave.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {leave.staffName || `${leave.staff?.firstName} ${leave.staff?.lastName}`}
                  </CardTitle>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {leave.days} days
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Leave Type:</span>
                      <span className="ml-2 font-medium">{leave.leaveType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Period:</span>
                      <span className="ml-2 font-medium">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    {leave.staff?.unit && (
                      <div>
                        <span className="text-muted-foreground">Unit:</span>
                        <span className="ml-2 font-medium">{leave.staff.unit}</span>
                      </div>
                    )}
                    {leave.staff?.directorate && (
                      <div>
                        <span className="text-muted-foreground">Directorate:</span>
                        <span className="ml-2 font-medium">{leave.staff.directorate}</span>
                      </div>
                    )}
                  </div>
                  
                  {leave.reason && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Reason:</span>
                      <p className="mt-1">{leave.reason}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {canApprove && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(leave.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(leave.id)}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    {onView && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(leave.id)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

