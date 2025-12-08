'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useState } from 'react'
import LeaveForm from './leave-form'
import type { ReturnType } from '@/lib/data-store'

interface EmployeeLeaveHistoryProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  staffId: string
}

export default function EmployeeLeaveHistory({ store, staffId }: EmployeeLeaveHistoryProps) {
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  
  const myLeaves = store.leaves
    .filter(l => l.staffId === staffId)
    .filter(l => filterStatus === 'all' ? true : l.status === filterStatus)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

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
              myLeaves.map(leave => (
                <div key={leave.id} className="border border-border rounded-lg p-4 hover:bg-secondary/5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{leave.leaveType}</Badge>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(leave.status)}
                          <span className="text-sm font-medium capitalize">{leave.status}</span>
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
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-semibold mb-1">Approval Status:</p>
                          {leave.approvalLevels.map((level, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground">
                              Level {level.level} ({level.approverRole}): {level.status}
                              {level.approverName && ` by ${level.approverName}`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

