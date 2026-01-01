/**
 * Leave Encashment Management Component
 * HR Director/Chief Director only - Manage leave encashment requests
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { DollarSign, AlertTriangle, CheckCircle, XCircle, Plus } from 'lucide-react'
import { apiRequest } from '@/lib/api-config'
import { format } from 'date-fns'

interface EncashmentRequest {
  id: string
  staffId: string
  leaveType: string
  days: number
  reason: string
  reasonDetails?: string
  status: string
  amount?: number
  createdAt: string
  approvedAt?: string
  staff: {
    staffId: string
    firstName: string
    lastName: string
    email: string
    position: string
    employmentStatus: string
  }
}

export default function LeaveEncashmentManagement() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [encashments, setEncashments] = useState<EncashmentRequest[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [selectedEncashment, setSelectedEncashment] = useState<EncashmentRequest | null>(null)
  const [formData, setFormData] = useState({
    staffId: '',
    leaveType: '',
    days: '',
    reason: '',
    reasonCode: '',
    reasonDetails: '',
  })
  const [approveData, setApproveData] = useState({
    amount: '',
  })
  const [staffList, setStaffList] = useState<Array<{ staffId: string; firstName: string; lastName: string; employmentStatus: string }>>([])

  useEffect(() => {
    fetchEncashments()
    fetchStaffList()
  }, [])

  const fetchEncashments = async () => {
    try {
      const response = await apiRequest('/api/leave-encashment')
      if (response.ok) {
        const data = await response.json()
        setEncashments(data)
      }
    } catch (error) {
      console.error('Error fetching encashments:', error)
    }
  }

  const fetchStaffList = async () => {
    try {
      const response = await apiRequest('/api/staff')
      if (response.ok) {
        const data = await response.json()
        setStaffList(data.filter((s: any) => s.active))
      }
    } catch (error) {
      console.error('Error fetching staff list:', error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await apiRequest('/api/leave-encashment', {
        method: 'POST',
        body: JSON.stringify({
          staffId: formData.staffId,
          leaveType: formData.leaveType,
          days: parseFloat(formData.days),
          reason: formData.reason,
          reasonCode: formData.reasonCode || null,
          reasonDetails: formData.reasonDetails || null,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Encashment request created successfully',
        })
        setShowCreateDialog(false)
        setFormData({ staffId: '', leaveType: '', days: '', reason: '', reasonCode: '', reasonDetails: '' })
        fetchEncashments()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create encashment request')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create encashment request',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (action: 'approve' | 'reject') => {
    if (!selectedEncashment) return

    setLoading(true)

    try {
      const response = await apiRequest(`/api/leave-encashment/${selectedEncashment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          amount: action === 'approve' ? (approveData.amount ? parseFloat(approveData.amount) : null) : null,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Encashment request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        })
        setShowApproveDialog(false)
        setSelectedEncashment(null)
        setApproveData({ amount: '' })
        fetchEncashments()
      } else {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${action} encashment request`)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} encashment request`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'retirement':
        return 'Retirement'
      case 'exit':
        return 'Exit'
      case 'special_authorization':
        return 'Special Authorization'
      default:
        return reason
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Encashment Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage leave encashment requests (restricted to retirement, exit, or special authorization)
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Encashment Request
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Restricted Access:</strong> Leave encashment is only allowed for retirement, exit, or special authorization. 
          Only HR Director or Chief Director can create and approve encashment requests.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Encashment Requests</CardTitle>
          <CardDescription>All leave encashment requests</CardDescription>
        </CardHeader>
        <CardContent>
          {encashments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No encashment requests</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encashments.map((encashment) => (
                  <TableRow key={encashment.id}>
                    <TableCell>
                      {encashment.staff.firstName} {encashment.staff.lastName}
                      <br />
                      <span className="text-xs text-muted-foreground">{encashment.staff.staffId}</span>
                    </TableCell>
                    <TableCell>{encashment.leaveType}</TableCell>
                    <TableCell>{encashment.days.toFixed(1)}</TableCell>
                    <TableCell>
                      {getReasonLabel(encashment.reason)}
                      {encashment.reasonDetails && (
                        <>
                          <br />
                          <span className="text-xs text-muted-foreground">{encashment.reasonDetails}</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(encashment.status)}</TableCell>
                    <TableCell>
                      {encashment.amount ? `GHS ${encashment.amount.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(encashment.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {encashment.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEncashment(encashment)
                            setShowApproveDialog(true)
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Encashment Request</DialogTitle>
            <DialogDescription>
              Create a leave encashment request for a staff member (retirement, exit, or special authorization only)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="staffId">Staff Member</Label>
              <Select
                value={formData.staffId}
                onValueChange={(value) => setFormData({ ...formData, staffId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((staff) => (
                    <SelectItem key={staff.staffId} value={staff.staffId}>
                      {staff.firstName} {staff.lastName} ({staff.staffId}) - {staff.employmentStatus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select
                value={formData.leaveType}
                onValueChange={(value) => setFormData({ ...formData, leaveType: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Sick">Sick</SelectItem>
                  <SelectItem value="Special Service">Special Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="days">Days to Encash</Label>
              <Input
                id="days"
                type="number"
                min="0.5"
                step="0.5"
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retirement">Retirement</SelectItem>
                  <SelectItem value="exit">Exit</SelectItem>
                  <SelectItem value="special_authorization">Special Authorization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.reason === 'special_authorization' && (
              <div>
                <Label htmlFor="reasonDetails">Authorization Details (Required)</Label>
                <Textarea
                  id="reasonDetails"
                  value={formData.reasonDetails}
                  onChange={(e) => setFormData({ ...formData, reasonDetails: e.target.value })}
                  placeholder="Provide details for special authorization"
                  required={formData.reason === 'special_authorization'}
                  rows={3}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Encashment Request</DialogTitle>
            <DialogDescription>
              Approve or reject the encashment request
            </DialogDescription>
          </DialogHeader>
          {selectedEncashment && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">Staff:</p>
                <p>{selectedEncashment.staff.firstName} {selectedEncashment.staff.lastName} ({selectedEncashment.staff.staffId})</p>
              </div>
              <div>
                <p className="font-medium">Leave Type:</p>
                <p>{selectedEncashment.leaveType}</p>
              </div>
              <div>
                <p className="font-medium">Days:</p>
                <p>{selectedEncashment.days.toFixed(1)}</p>
              </div>
              <div>
                <p className="font-medium">Reason:</p>
                <p>{getReasonLabel(selectedEncashment.reason)}</p>
                {selectedEncashment.reasonDetails && (
                  <p className="text-sm text-muted-foreground">{selectedEncashment.reasonDetails}</p>
                )}
              </div>

              <div>
                <Label htmlFor="amount">Encashment Amount (Optional)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={approveData.amount}
                  onChange={(e) => setApproveData({ amount: e.target.value })}
                  placeholder="Enter amount in GHS"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleApprove('reject')}
                  disabled={loading}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  type="button"
                  onClick={() => handleApprove('approve')}
                  disabled={loading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

