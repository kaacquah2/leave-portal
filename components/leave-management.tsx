'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import LeaveForm from './leave-form'
import type { ReturnType } from '@/lib/data-store'
import { PermissionChecks, type UserRole } from '@/lib/permissions'

interface LeaveManagementProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  userRole: string
}

export default function LeaveManagement({ store, userRole }: LeaveManagementProps) {
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const { toast } = useToast()
  
  const role = userRole as UserRole
  
  // Permission checks
  const canApproveLeaveAll = PermissionChecks.canApproveLeaveAll(role)
  const canApproveLeaveTeam = PermissionChecks.canApproveLeaveTeam(role)
  const canViewAllLeaves = PermissionChecks.canViewAllLeaves(role)
  const canViewTeamLeaves = PermissionChecks.canViewTeamLeaves(role)
  
  const canApproveLeaves = canApproveLeaveAll || canApproveLeaveTeam

  // Handle approval with notifications
  const handleApprove = async (leaveId: string, status: 'approved' | 'rejected', approvedBy: string, level?: number) => {
    const leave = store.leaves.find(l => l.id === leaveId)
    if (!leave) return

    try {
      await store.updateLeaveRequest(leaveId, status, approvedBy, level)
      
      // Show toast notification
      if (leave.approvalLevels && level !== undefined) {
        const levelInfo = leave.approvalLevels.find(l => l.level === level)
        const isFinalLevel = leave.approvalLevels.length === level
        const allLevelsApproved = leave.approvalLevels.every(l => l.level === level ? status === 'approved' : l.status === 'approved')
        
        if (status === 'approved') {
          if (isFinalLevel || allLevelsApproved) {
            toast({
              title: "Leave Request Approved",
              description: `${leave.staffName}'s ${leave.leaveType} leave request has been fully approved.`,
            })
          } else {
            toast({
              title: "Approval Level Completed",
              description: `Level ${level} (${levelInfo?.approverRole}) approved. Waiting for next level approval.`,
            })
          }
        } else {
          toast({
            title: "Leave Request Rejected",
            description: `${leave.staffName}'s ${leave.leaveType} leave request has been rejected at level ${level}.`,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: status === 'approved' ? "Leave Request Approved" : "Leave Request Rejected",
          description: `${leave.staffName}'s ${leave.leaveType} leave request has been ${status === 'approved' ? 'approved' : 'rejected'}.`,
          variant: status === 'approved' ? 'default' : 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating leave request:', error)
      toast({
        title: "Error",
        description: "Failed to update leave request. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getRoleTheme = () => {
    switch (userRole) {
      case 'hr':
        return {
          gradient: 'from-green-50 to-background',
          accent: 'text-green-600',
          border: 'border-green-200',
          bg: 'bg-green-50',
        }
      case 'manager':
        return {
          gradient: 'from-amber-50 to-background',
          accent: 'text-amber-600',
          border: 'border-amber-200',
          bg: 'bg-amber-50',
        }
      default:
        return {
          gradient: 'from-background to-background',
          accent: 'text-primary',
          border: 'border-border',
          bg: 'bg-background',
        }
    }
  }

  const theme = getRoleTheme()

  // Role-specific filtering based on permissions
  const getFilteredLeaves = () => {
    let leaves = store.leaves
    
    // Manager: Only see team leaves
    if (role === 'manager') {
      // In production, filter by manager's team/department
      // For demo, showing all but focusing on pending
      if (filterStatus === 'all') {
        leaves = leaves.filter(l => l.status === 'pending' || l.status === 'approved')
      }
    }
    
    // HR: See all leaves
    return leaves.filter(l => 
      filterStatus === 'all' ? true : l.status === filterStatus
    )
  }

  const filteredLeaves = getFilteredLeaves()

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

  const getTitle = () => {
    switch (role) {
      case 'hr':
        return 'Leave Processing'
      case 'manager':
        return 'Team Leave Approvals'
      default:
        return 'Leave Management'
    }
  }

  const getSubtitle = () => {
    switch (role) {
      case 'hr':
        return 'Process and approve/decline all staff leave requests'
      case 'manager':
        return 'Review and approve leave requests from your team members'
      default:
        return 'Submit and manage leave requests'
    }
  }

  return (
    <div className={`p-8 space-y-6 bg-gradient-to-b ${theme.gradient}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{getTitle()}</h1>
          <p className="text-muted-foreground">{getSubtitle()}</p>
        </div>
        {!showForm && role !== 'manager' && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            Submit Leave Request
          </Button>
        )}
      </div>

      {showForm && (
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader>
            <CardTitle>Submit Leave Request</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveForm store={store} onClose={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {role === 'manager' ? 'Awaiting Review' : 'Pending'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${theme.accent}`}>{store.leaves.filter(l => l.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{store.leaves.filter(l => l.status === 'approved').length}</p>
          </CardContent>
        </Card>
        {role !== 'manager' && (
          <Card className={`border-2 ${theme.border}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{store.leaves.filter(l => l.status === 'rejected').length}</p>
            </CardContent>
          </Card>
        )}
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {role === 'manager' ? 'Team Total' : 'Total'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${theme.accent}`}>{store.leaves.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className={`border-2 ${theme.border}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {role === 'hr' && 'Leave Requests'}
                {role === 'manager' && 'Team Leave Requests'}
              </CardTitle>
              <CardDescription>
                {role === 'hr' && 'Process and manage leave requests'}
                {role === 'manager' && 'Review and approve team leave requests'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {(role === 'manager' 
                ? ['all', 'pending', 'approved'] as const 
                : ['all', 'pending', 'approved', 'rejected'] as const
              ).map(status => (
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLeaves.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No leave requests found</p>
            ) : (
              filteredLeaves.map(leave => (
                <div key={leave.id} className="border border-border rounded-lg p-4 hover:bg-secondary/5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{leave.staffName}</h4>
                        <Badge variant="outline">{leave.leaveType}</Badge>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(leave.status)}
                          <span className="text-sm font-medium capitalize">{leave.status}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{leave.reason}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
                        <p><strong>From:</strong> {new Date(leave.startDate).toLocaleDateString()}</p>
                        <p><strong>To:</strong> {new Date(leave.endDate).toLocaleDateString()}</p>
                        <p><strong>Duration:</strong> {leave.days} days</p>
                        {leave.approvedBy && <p><strong>Approved by:</strong> {leave.approvedBy}</p>}
                      </div>
                      {leave.approvalLevels && leave.approvalLevels.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-semibold mb-1">Approval Status:</p>
                          {leave.approvalLevels.map((level, idx) => {
                            const isPending = level.status === 'pending'
                            const isCurrentLevel = leave.approvalLevels!
                              .filter(l => l.level < level.level)
                              .every(l => l.status === 'approved') && isPending
                            
                            return (
                              <div key={idx} className={`text-xs flex items-center gap-2 mb-1 ${isCurrentLevel ? 'font-semibold text-amber-600' : 'text-muted-foreground'}`}>
                                <span>Level {level.level} ({level.approverRole}):</span>
                                <Badge 
                                  variant={
                                    level.status === 'approved' ? 'default' :
                                    level.status === 'rejected' ? 'destructive' : 'secondary'
                                  }
                                  className={`text-xs ${isCurrentLevel ? 'ring-2 ring-amber-400' : ''}`}
                                >
                                  {level.status}
                                  {isCurrentLevel && ' (Awaiting)'}
                                </Badge>
                                {level.approverName && <span>by {level.approverName}</span>}
                                {level.approvalDate && level.status !== 'pending' && (
                                  <span className="text-xs opacity-70">
                                    on {new Date(level.approvalDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                          {leave.approvalLevels.some(l => l.status === 'pending') && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              {leave.approvalLevels.filter(l => l.status === 'pending').length} level(s) pending approval
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {canApproveLeaves && leave.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        {leave.approvalLevels && leave.approvalLevels.length > 0 ? (
                          // Multi-level approval
                          leave.approvalLevels
                            .filter(level => {
                              // Show approval buttons for the current level that needs approval
                              const previousLevelsApproved = leave.approvalLevels!
                                .filter(l => l.level < level.level)
                                .every(l => l.status === 'approved')
                              const isCurrentLevel = (
                                (role === 'manager' && level.approverRole === 'manager' && level.status === 'pending') ||
                                (role === 'hr' && level.approverRole === 'hr' && level.status === 'pending')
                              )
                              return previousLevelsApproved && isCurrentLevel
                            })
                            .map((level, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(leave.id, 'approved', role === 'hr' ? 'HR Officer' : 'Manager', level.level)}
                                  className={`text-xs ${role === 'hr' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                                >
                                  Approve Level {level.level}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleApprove(leave.id, 'rejected', role === 'hr' ? 'HR Officer' : 'Manager', level.level)}
                                  className="text-xs"
                                >
                                  Reject
                                </Button>
                              </div>
                            ))
                        ) : (
                          // Single-level approval
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(leave.id, 'approved', role === 'hr' ? 'HR Officer' : 'Manager')}
                              className={`text-xs ${role === 'hr' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApprove(leave.id, 'rejected', role === 'hr' ? 'HR Officer' : 'Manager')}
                              className="text-xs"
                            >
                              Reject
                            </Button>
                          </>
                        )}
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
