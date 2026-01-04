/**
 * Deferment Management Component
 * For Supervisors, Unit Heads, and HR to view and manage deferment requests
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText,
  User,
  Filter
} from 'lucide-react'
import { apiRequest } from '@/lib/api-config'
import { useToast } from '@/components/ui/use-toast'
import { type UserRole } from '@/lib/permissions'

interface DefermentRequest {
  id: string
  staffId: string
  leaveRequestId: string
  requestedDefermentDate: string
  reason: string
  status: 'pending' | 'supervisor_approved' | 'hr_approved' | 'rejected'
  supervisorRecommendation?: string
  hrComments?: string
  createdAt: string
  staff: {
    staffId: string
    firstName: string
    lastName: string
    email: string
    position: string
  }
  leaveRequest?: {
    id: string
    leaveType: string
    startDate: string
    endDate: string
    days: number
  }
}

interface DefermentManagementProps {
  userRole: UserRole
  staffId?: string
}

export default function DefermentManagement({ userRole, staffId }: DefermentManagementProps) {
  const [deferments, setDeferments] = useState<DefermentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedDeferment, setSelectedDeferment] = useState<DefermentRequest | null>(null)
  const [showActionDialog, setShowActionDialog] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [comments, setComments] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchDeferments()
  }, [filterStatus, staffId])

  const fetchDeferments = async () => {
    try {
      setLoading(true)
      const url = filterStatus !== 'all' 
        ? `/api/leave-deferment?status=${filterStatus}${staffId ? `&staffId=${staffId}` : ''}`
        : `/api/leave-deferment${staffId ? `?staffId=${staffId}` : ''}`
      
      const response = await apiRequest(url)
      if (response.ok) {
        const data = await response.json()
        setDeferments(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch deferments')
        setDeferments([])
      }
    } catch (error) {
      console.error('Error fetching deferments:', error)
      setDeferments([])
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedDeferment || !action) return

    try {
      const response = await apiRequest(`/api/leave-deferment/${selectedDeferment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          comments,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Deferment request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        })
        setShowActionDialog(false)
        setSelectedDeferment(null)
        setAction(null)
        setComments('')
        fetchDeferments()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || `Failed to ${action} deferment request`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error processing deferment:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while processing the deferment request',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800">Pending</Badge>
      case 'supervisor_approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-800">Supervisor Approved</Badge>
      case 'hr_approved':
        return <Badge variant="outline" className="bg-green-50 text-green-800">HR Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const canApprove = (deferment: DefermentRequest) => {
    if (userRole === 'HR_OFFICER' || userRole === 'hr_officer' || userRole === 'hr') {
      return deferment.status === 'supervisor_approved'
    }
    if (userRole === 'SUPERVISOR' || userRole === 'supervisor' || userRole === 'UNIT_HEAD' || userRole === 'unit_head') {
      return deferment.status === 'pending'
    }
    return false
  }

  const filteredDeferments = deferments.filter((d) => {
    if (filterStatus === 'all') return true
    return d.status === filterStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Deferment Management</h1>
        <p className="text-muted-foreground mt-1">
          View and manage leave deferment requests
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="supervisor_approved">Supervisor Approved</SelectItem>
                  <SelectItem value="hr_approved">HR Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deferment Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Deferment Requests ({filteredDeferments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDeferments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No deferment requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeferments.map((deferment) => (
                <div
                  key={deferment.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {deferment.staff.firstName} {deferment.staff.lastName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({deferment.staff.staffId})
                        </span>
                        {getStatusBadge(deferment.status)}
                      </div>
                      
                      {deferment.leaveRequest && (
                        <div className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium">Original Leave:</span> {deferment.leaveRequest.leaveType} - 
                          {new Date(deferment.leaveRequest.startDate).toLocaleDateString()} to{' '}
                          {new Date(deferment.leaveRequest.endDate).toLocaleDateString()} ({deferment.leaveRequest.days} days)
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground mb-2">
                        <span className="font-medium">Requested Deferment Date:</span>{' '}
                        {new Date(deferment.requestedDefermentDate).toLocaleDateString()}
                      </div>

                      <div className="text-sm mb-2">
                        <span className="font-medium">Reason:</span> {deferment.reason}
                      </div>

                      {deferment.supervisorRecommendation && (
                        <div className="text-sm text-blue-700 mb-2">
                          <span className="font-medium">Supervisor Recommendation:</span>{' '}
                          {deferment.supervisorRecommendation}
                        </div>
                      )}

                      {deferment.hrComments && (
                        <div className="text-sm text-green-700 mb-2">
                          <span className="font-medium">HR Comments:</span> {deferment.hrComments}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Submitted: {new Date(deferment.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {canApprove(deferment) && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-700"
                            onClick={() => {
                              setSelectedDeferment(deferment)
                              setAction('approve')
                              setShowActionDialog(true)
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-700"
                            onClick={() => {
                              setSelectedDeferment(deferment)
                              setAction('reject')
                              setShowActionDialog(true)
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve' : 'Reject'} Deferment Request
            </DialogTitle>
            <DialogDescription>
              {action === 'approve' 
                ? 'Please provide comments for approving this deferment request.'
                : 'Please provide a reason for rejecting this deferment request.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Comments *</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={action === 'approve' 
                  ? 'Enter approval comments...'
                  : 'Enter rejection reason...'}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowActionDialog(false)
                setSelectedDeferment(null)
                setAction(null)
                setComments('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={!comments.trim()}
              variant={action === 'reject' ? 'destructive' : 'default'}
            >
              {action === 'approve' ? 'Approve' : 'Reject'} Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

