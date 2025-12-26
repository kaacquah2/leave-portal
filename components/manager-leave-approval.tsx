'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Clock, AlertCircle, User, Calendar, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: string
  approvedBy?: string
  approvalDate?: string
  createdAt: string
  staff?: {
    department: string
    position: string
  }
}

export default function ManagerLeaveApproval() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const { toast } = useToast()

  useEffect(() => {
    fetchLeaves()
  }, [])

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/leaves', {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch leaves')
      
      const data = await response.json()
      // Filter to show only team members' leaves
      // In production, filter by manager's department/team
      setLeaves(data)
    } catch (error) {
      console.error('Error fetching leaves:', error)
      toast({
        title: 'Error',
        description: 'Failed to load leave requests',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (leaveId: string, status: 'approved' | 'rejected', comments?: string) => {
    // Optimistic update: store previous state
    const previousLeave = leaves.find(l => l.id === leaveId)
    if (!previousLeave) return

    // Create optimistic update
    const optimisticUpdate = {
      ...previousLeave,
      status,
      approvedBy: 'Manager',
      approvalDate: new Date().toISOString(),
    }

    // Update UI immediately (optimistic)
    setLeaves(leaves.map(l => l.id === leaveId ? optimisticUpdate : l))

    // Show immediate feedback
    toast({
      title: status === 'approved' ? 'Leave Approved' : 'Leave Rejected',
      description: `Leave request has been ${status}.`,
      variant: status === 'approved' ? 'default' : 'destructive',
    })

    try {
      const response = await fetch(`/api/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status,
          approvedBy: 'Manager', // Get from auth context
          comments,
        }),
      })

      if (!response.ok) {
        // Revert optimistic update on error
        setLeaves(leaves.map(l => l.id === leaveId ? previousLeave : l))
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(errorData?.error || 'Failed to update leave request')
        ;(error as any).errorData = errorData
        throw error
      }

      const updated = await response.json()
      
      // Update with real data from server
      setLeaves(leaves.map(l => l.id === leaveId ? updated : l))

      // Refresh list to get latest state
      fetchLeaves()
    } catch (error: any) {
      console.error('Error updating leave:', error)
      const errorData = error?.errorData || {}
      const troubleshooting = errorData?.troubleshooting || [
        'Verify you have manager role',
        'Check if you are the assigned approver',
        'Refresh the page',
        'Check browser console for errors',
        'Contact IT support',
      ]
      
      toast({
        title: errorData?.error || 'Error',
        description: errorData?.error || 'Failed to update leave request. Changes have been reverted.',
        variant: 'destructive',
        duration: 8000,
      })
      
      // Log troubleshooting for debugging
      if (troubleshooting.length > 0) {
        console.log('Troubleshooting steps:', troubleshooting)
      }
    }
  }

  const pendingLeaves = leaves.filter(l => l.status === 'pending')
  const approvedLeaves = leaves.filter(l => l.status === 'approved')
  const rejectedLeaves = leaves.filter(l => l.status === 'rejected')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const renderLeaveCard = (leave: LeaveRequest, showActions: boolean = false) => (
    <Card key={leave.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              {leave.staffName}
            </CardTitle>
            <CardDescription className="mt-1">
              {leave.staff?.department} • {leave.staff?.position}
            </CardDescription>
          </div>
          {getStatusBadge(leave.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Leave Type</p>
            <p className="font-semibold">{leave.leaveType}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Duration</p>
            <p className="font-semibold">{leave.days} day{leave.days !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Start Date</p>
            <p className="font-semibold flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(leave.startDate), 'MMM dd, yyyy')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">End Date</p>
            <p className="font-semibold flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(leave.endDate), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>

        <div>
          <p className="text-muted-foreground mb-1 flex items-center gap-1">
            <FileText className="w-4 h-4" />
            Reason
          </p>
          <p className="text-sm bg-muted/50 p-2 rounded">{leave.reason}</p>
        </div>

        {showActions && leave.status === 'pending' && (
          <div className="pt-4 border-t flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => handleApprove(leave.id, 'approved')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => handleApprove(leave.id, 'rejected')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {leave.approvedBy && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            {leave.status === 'approved' ? 'Approved' : 'Rejected'} by {leave.approvedBy}
            {leave.approvalDate && ` on ${format(new Date(leave.approvalDate), 'MMM dd, yyyy')}`}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading leave requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Approve Leaves</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve leave requests from your team members
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingLeaves.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{approvedLeaves.length}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingLeaves.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedLeaves.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedLeaves.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingLeaves.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold">No pending leave requests</p>
                  <p className="text-muted-foreground">All leave requests have been processed</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingLeaves.map(leave => renderLeaveCard(leave, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-6">
          {approvedLeaves.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No approved leaves</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {approvedLeaves.map(leave => renderLeaveCard(leave, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-6">
          {rejectedLeaves.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No rejected leaves</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rejectedLeaves.map(leave => renderLeaveCard(leave, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

