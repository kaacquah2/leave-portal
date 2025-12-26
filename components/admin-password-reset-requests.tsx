'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle2, XCircle, Clock, AlertCircle, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface PasswordResetRequest {
  id: string
  email: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requestedAt: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
  completedAt?: string
  resetToken?: string
  tokenExpiresAt?: string
  user: {
    id: string
    email: string
    role: string
    staff?: {
      firstName: string
      lastName: string
      staffId: string
      department: string
    }
  }
}

export default function AdminPasswordResetRequests() {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all')
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const fetchRequests = async () => {
    try {
      const statusParam = filter === 'all' ? '' : `?status=${filter}`
      const response = await fetch(`/api/admin/password-reset-requests${statusParam}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setRequests(data)
      }
    } catch (error) {
      console.error('Error fetching password reset requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (request: PasswordResetRequest) => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/admin/password-reset-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          requestId: request.id,
          action: 'approve',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`Password reset approved! Reset token: ${data.resetToken}`)
        setTimeout(() => setSuccessMessage(''), 10000)
        fetchRequests()
      } else {
        alert(data.error || 'Failed to approve password reset request')
      }
    } catch (error) {
      console.error('Error approving request:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/admin/password-reset-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: 'reject',
          rejectionReason: rejectionReason || 'No reason provided',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setShowRejectDialog(false)
        setRejectionReason('')
        setSelectedRequest(null)
        fetchRequests()
      } else {
        alert(data.error || 'Failed to reject password reset request')
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (loading) {
    return <div className="p-8">Loading password reset requests...</div>
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Password Reset Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve password reset requests from users
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="outline" className="text-lg px-4 py-2">
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>Total: {requests.length} requests</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
                className="gap-1"
              >
                <Clock className="w-4 h-4" />
                Pending
              </Button>
              <Button
                variant={filter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('approved')}
              >
                Approved
              </Button>
              <Button
                variant={filter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('rejected')}
              >
                Rejected
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No password reset requests found.
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{request.email}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      {request.user.staff && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {request.user.staff.firstName} {request.user.staff.lastName} 
                          {' • '}
                          {request.user.staff.staffId} 
                          {' • '}
                          {request.user.staff.department}
                        </p>
                      )}

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Requested: {new Date(request.requestedAt).toLocaleString()}</p>
                        {request.approvedAt && (
                          <p>Approved: {new Date(request.approvedAt).toLocaleString()} by {request.approvedBy}</p>
                        )}
                        {request.rejectedAt && (
                          <>
                            <p>Rejected: {new Date(request.rejectedAt).toLocaleString()} by {request.rejectedBy}</p>
                            {request.rejectionReason && (
                              <p className="text-destructive">Reason: {request.rejectionReason}</p>
                            )}
                          </>
                        )}
                        {request.completedAt && (
                          <p>Completed: {new Date(request.completedAt).toLocaleString()}</p>
                        )}
                        {request.resetToken && request.status === 'approved' && (
                          <div className="mt-2 p-2 bg-muted rounded flex items-center gap-2">
                            <code className="text-xs flex-1">{request.resetToken}</code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(request.resetToken!)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(request)}
                            disabled={isProcessing}
                            className="gap-1"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRequest(request)
                              setShowRejectDialog(true)
                            }}
                            disabled={isProcessing}
                            className="gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Password Reset Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this password reset request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false)
                setRejectionReason('')
                setSelectedRequest(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

