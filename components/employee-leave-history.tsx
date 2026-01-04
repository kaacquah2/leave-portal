'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, CheckCircle, XCircle, Clock, Download } from 'lucide-react'
import { useState } from 'react'
import LeaveForm from './leave-form'

interface EmployeeLeaveHistoryProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  staffId: string
}

export default function EmployeeLeaveHistory({ store, staffId }: EmployeeLeaveHistoryProps) {
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  
  const myLeaves = store.leaves
    .filter((l: any) => l.staffId === staffId)
    .filter((l: any) => filterStatus === 'all' ? true : l.status === filterStatus)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return null
    }
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave History</h1>
          <p className="text-muted-foreground mt-1">View all your leave requests</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Request Leave
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Submit Leave Request</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveForm store={store} onClose={() => setShowForm(false)} staffId={staffId} />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
          <Button
            key={status}
            variant={filterStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle>My Leave Requests</CardTitle>
          <CardDescription>Total: {myLeaves.length} requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myLeaves.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No leave requests found</p>
            ) : (
              myLeaves.map((leave: any) => (
                <div key={leave.id} className="border border-border rounded-lg p-4 hover:bg-secondary/5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{leave.leaveType}</Badge>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(leave.status)}
                          <Badge 
                            variant={
                              leave.status === 'approved' ? 'default' :
                              leave.status === 'rejected' ? 'destructive' : 
                              'secondary'
                            }
                            className="capitalize"
                          >
                            {leave.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{leave.reason}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <p><strong>From:</strong> {new Date(leave.startDate).toLocaleDateString()}</p>
                        <p><strong>To:</strong> {new Date(leave.endDate).toLocaleDateString()}</p>
                        <p><strong>Duration:</strong> {leave.days} days</p>
                        {leave.approvedBy && <p><strong>Approved by:</strong> {leave.approvedBy}</p>}
                        {leave.approvalDate && <p><strong>Date:</strong> {new Date(leave.approvalDate).toLocaleDateString()}</p>}
                      </div>
                      {leave.approvalLevels && leave.approvalLevels.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-semibold mb-2 text-foreground">Approval Workflow:</p>
                          <div className="space-y-2">
                            {leave.approvalLevels.map((level: any, idx: number) => {
                              // Determine if this is the current pending level
                              const previousLevels = leave.approvalLevels.filter((l: any) => l.level < level.level)
                              const previousApproved = previousLevels.every((l: any) => l.status === 'approved')
                              const isCurrentPending = level.status === 'pending' && (idx === 0 || previousApproved)
                              
                              return (
                                <div 
                                  key={idx} 
                                  className={`flex items-center gap-2 p-2 rounded text-xs ${
                                    isCurrentPending 
                                      ? 'bg-amber-50 border border-amber-200' 
                                      : level.status === 'approved'
                                      ? 'bg-green-50 border border-green-200'
                                      : level.status === 'rejected'
                                      ? 'bg-red-50 border border-red-200'
                                      : 'bg-gray-50 border border-gray-200'
                                  }`}
                                >
                                  <div className="flex-shrink-0">
                                    {level.status === 'approved' ? (
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : level.status === 'rejected' ? (
                                      <XCircle className="w-4 h-4 text-red-600" />
                                    ) : (
                                      <Clock className="w-4 h-4 text-amber-600" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
                                        Level {level.level} - {level.approverRole === 'manager' ? 'Manager' : level.approverRole === 'hr' ? 'HR Officer' : level.approverRole}
                                      </span>
                                      <Badge 
                                        variant={
                                          level.status === 'approved' ? 'default' :
                                          level.status === 'rejected' ? 'destructive' : 
                                          'secondary'
                                        }
                                        className={`text-xs ${
                                          isCurrentPending ? 'bg-amber-600 text-white' : ''
                                        }`}
                                      >
                                        {level.status === 'pending' && isCurrentPending ? 'Awaiting' : level.status}
                                      </Badge>
                                    </div>
                                    {level.approverName && level.status !== 'pending' && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Approved by {level.approverName}
                                        {level.approvalDate && ` on ${new Date(level.approvalDate).toLocaleDateString()}`}
                                      </p>
                                    )}
                                    {isCurrentPending && (
                                      <p className="text-xs text-amber-700 mt-1 font-medium">
                                        ⏳ Waiting for {level.approverRole === 'manager' ? 'Manager' : 'HR Officer'} approval
                                      </p>
                                    )}
                                    {level.comments && (
                                      <p className="text-xs text-muted-foreground mt-1 italic">
                                        "{level.comments}"
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    {leave.status === 'approved' && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={async () => {
                            try {
                              const { apiRequest } = await import('@/lib/api-config')
                              const response = await apiRequest(`/api/leaves/${leave.id}/approval-letter`, {
                                credentials: 'include'
                              })

                              if (response.ok) {
                                // Check if response is PDF (blob) or JSON
                                const contentType = response.headers.get('content-type')
                                if (contentType?.includes('application/pdf')) {
                                  // Handle PDF blob
                                  const blob = await response.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `leave-approval-${leave.id}.pdf`
                                  document.body.appendChild(a)
                                  a.click()
                                  window.URL.revokeObjectURL(url)
                                  document.body.removeChild(a)
                                } else {
                                  // Handle JSON response (legacy)
                                  const data = await response.json()
                                  if (data.letterContent) {
                                    const printWindow = window.open('', '_blank')
                                    if (printWindow) {
                                      printWindow.document.write(data.letterContent)
                                      printWindow.document.close()
                                      printWindow.focus()
                                      setTimeout(() => {
                                        printWindow.print()
                                      }, 250)
                                    }
                                  }
                                }
                              } else {
                                const error = await response.json().catch(() => ({ error: 'Failed to download approval letter' }))
                                alert(error.error || 'Failed to download approval letter')
                              }
                            } catch (error) {
                              console.error('Error downloading approval letter:', error)
                              alert('Failed to download approval letter')
                            }
                          }}
                        >
                          <Download className="w-4 h-4" />
                          Download Approval Letter
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

