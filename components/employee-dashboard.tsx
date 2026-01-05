'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar, Clock, FileText, Plus, DollarSign, TrendingUp, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import LeaveForm from '@/components/leave-form'
import { hasPermission, type UserRole } from '@/lib/roles'

interface EmployeeDashboardProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  staffId: string
  userRole: UserRole
  onNavigate?: (tab: string) => void
}

export default function EmployeeDashboard({ store, staffId, userRole, onNavigate }: EmployeeDashboardProps) {
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const staff = store.staff.find((s: any) => s.staffId === staffId)
  const balance = store.balances.find((b: any) => b.staffId === staffId)
  const myLeaves = store.leaves.filter((l: any) => l.staffId === staffId)
  const pendingLeaves = myLeaves.filter((l: any) => l.status === 'pending').length
  const approvedLeaves = myLeaves.filter((l: any) => l.status === 'approved').length

  // Debug logging
  useEffect(() => {
    console.log('[EmployeeDashboard] Render state:', {
      staffId,
      userRole,
      staffFound: !!staff,
      balanceFound: !!balance,
      staffCount: store.staff.length,
      balancesCount: store.balances.length,
      leavesCount: store.leaves.length,
      loading: store.loading,
      initialized: store.initialized,
      error: store.error
    })
  }, [staffId, userRole, staff, balance, store])

  // Show loading state - check if still loading or not initialized yet
  if (store.loading || !store.initialized) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state if data failed to load
  if (store.error) {
    return (
      <div className="p-8 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Data</h2>
          <p className="text-red-700 mb-4">{store.error}</p>
          <Button onClick={() => store.refresh?.()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Show message if staff not found after data has loaded
  if (!staff) {
    return (
      <div className="p-8 space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Staff Member Not Found</h2>
          <p className="text-yellow-700 mb-4">Your profile information could not be loaded. Please try refreshing.</p>
          <div className="mt-4 space-y-2 text-sm text-yellow-600">
            <p>Staff ID: {staffId}</p>
            <p>Available staff count: {store.staff.length}</p>
          </div>
          <Button onClick={() => store.refresh?.()} variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 mt-4">
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  const handleQuickAction = (action: string) => {
    if (action === 'apply-leave') {
      setShowLeaveForm(true)
    } else if (onNavigate) {
      onNavigate(action)
    }
  }

  // Check permissions
  const canViewLeave = hasPermission(userRole, 'employee:leave:view:own')
  const canCreateLeave = hasPermission(userRole, 'employee:leave:create:own')
  const canViewSelf = hasPermission(userRole, 'employee:self:view')
  const canViewPayslip = hasPermission(userRole, 'employee:payslip:view:own')
  const canViewPerformance = hasPermission(userRole, 'employee:performance:view:own')

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {staff.firstName}!</h1>
        <p className="text-muted-foreground mt-1">Your personal dashboard</p>
      </div>

      {/* Government HR: Simplified dashboard - core metrics only */}
      {canViewLeave && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Annual Leave Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{balance?.annual || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Days remaining</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{pendingLeaves}</p>
              <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Approved Leaves
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{approvedLeaves}</p>
              <p className="text-xs text-muted-foreground mt-1">This year</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!canViewLeave && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">You don't have permission to view leave information. Please contact HR if you believe this is an error.</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {canCreateLeave && (
            <Button
              onClick={() => handleQuickAction('apply-leave')}
              className="h-auto p-6 flex flex-col items-center gap-3 bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-8 h-8" />
              <span className="text-base font-semibold text-center">Apply for Leave</span>
            </Button>
          )}
          {canViewLeave && (
            <>
              <Button
                onClick={() => handleQuickAction('leave-history')}
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <FileText className="w-8 h-8" />
                <span className="text-base font-semibold text-center">View Leave History</span>
              </Button>
              <Button
                onClick={() => handleQuickAction('leave-balances')}
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Calendar className="w-8 h-8" />
                <span className="text-base font-semibold text-center">View Leave Balances</span>
              </Button>
            </>
          )}
          {canViewPayslip && (
            <Button
              onClick={() => handleQuickAction('payslips')}
              variant="outline"
              className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <DollarSign className="w-8 h-8" />
              <span className="text-base font-semibold text-center">View Payslips</span>
            </Button>
          )}
          {canViewPerformance && (
            <Button
              onClick={() => handleQuickAction('performance')}
              variant="outline"
              className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <TrendingUp className="w-8 h-8" />
              <span className="text-base font-semibold text-center">Performance Reviews</span>
            </Button>
          )}
        </div>
        {!canCreateLeave && !canViewLeave && !canViewPayslip && !canViewPerformance && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <p className="text-yellow-800">No quick actions available. Please contact HR to update your permissions.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {canViewSelf && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Staff ID</span>
                <span className="font-medium">{staff.staffId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Department</span>
                <span className="font-medium">{staff.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Position</span>
                <span className="font-medium">{staff.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={staff.active ? 'default' : 'secondary'}>
                  {staff.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {canViewLeave && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Leave Balances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {balance ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Annual</span>
                    <span className="font-medium">{balance.annual} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sick</span>
                    <span className="font-medium">{balance.sick} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Special Service</span>
                    <span className="font-medium">{balance.specialService} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Training</span>
                    <span className="font-medium">{balance.training} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Study</span>
                    <span className="font-medium">{balance.study} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Maternity</span>
                    <span className="font-medium">{balance.maternity} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Paternity</span>
                    <span className="font-medium">{balance.paternity} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Compassionate</span>
                    <span className="font-medium">{balance.compassionate} days</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Leave balance information not available.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Leave Requests */}
      {canViewLeave && myLeaves.length > 0 && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Leave Requests</CardTitle>
                <CardDescription>Track the status of your leave applications</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate?.('leave-history')}
                className="gap-2"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myLeaves
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((leave: any) => {
                  // Find current pending approval level
                  const currentPendingLevel = leave.approvalLevels?.find((level: any, idx: number) => {
                    if (level.status !== 'pending') return false
                    const previousLevels = leave.approvalLevels.filter((l: any) => l.level < level.level)
                    return previousLevels.length === 0 || previousLevels.every((l: any) => l.status === 'approved')
                  })

                  return (
                    <div
                      key={leave.id}
                      className="border border-border rounded-lg p-4 hover:bg-secondary/5 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{leave.leaveType}</Badge>
                            <div className="flex items-center gap-1">
                              {leave.status === 'approved' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : leave.status === 'rejected' ? (
                                <XCircle className="w-4 h-4 text-red-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-600" />
                              )}
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
                          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                            <p className="text-muted-foreground">
                              <strong>From:</strong> {new Date(leave.startDate).toLocaleDateString()}
                            </p>
                            <p className="text-muted-foreground">
                              <strong>To:</strong> {new Date(leave.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-muted-foreground">
                              <strong>Duration:</strong> {leave.days} day{leave.days !== 1 ? 's' : ''}
                            </p>
                            {leave.status === 'approved' && leave.approvedBy && (
                              <p className="text-muted-foreground">
                                <strong>Approved by:</strong> {leave.approvedBy}
                              </p>
                            )}
                          </div>
                          {leave.status === 'pending' && currentPendingLevel && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                              <p className="text-amber-800 font-medium">
                                ⏳ Awaiting {currentPendingLevel.approverRole === 'manager' ? 'Manager' : 'HR Officer'} approval
                              </p>
                            </div>
                          )}
                          {leave.status === 'approved' && leave.approvalDate && (
                            <p className="text-xs text-green-700 mt-2">
                              ✓ Approved on {new Date(leave.approvalDate).toLocaleDateString()}
                            </p>
                          )}
                          {leave.status === 'rejected' && leave.approvalDate && (
                            <p className="text-xs text-red-700 mt-2">
                              ✗ Rejected on {new Date(leave.approvalDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
            {myLeaves.length > 5 && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => onNavigate?.('leave-history')}
                  className="gap-2"
                >
                  View All {myLeaves.length} Requests
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leave Form Dialog */}
      {canCreateLeave && (
        <Dialog open={showLeaveForm} onOpenChange={setShowLeaveForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <LeaveForm store={store} onClose={() => setShowLeaveForm(false)} staffId={staffId} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

