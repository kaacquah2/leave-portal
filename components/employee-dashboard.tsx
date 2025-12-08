'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, DollarSign, Award, Clock } from 'lucide-react'
import type { ReturnType } from '@/lib/data-store'

interface EmployeeDashboardProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  staffId: string
}

export default function EmployeeDashboard({ store, staffId }: EmployeeDashboardProps) {
  const staff = store.staff.find(s => s.staffId === staffId)
  const balance = store.balances.find(b => b.staffId === staffId)
  const myLeaves = store.leaves.filter(l => l.staffId === staffId)
  const pendingLeaves = myLeaves.filter(l => l.status === 'pending').length
  const recentPayslip = store.payslips.filter(p => p.staffId === staffId).sort((a, b) => 
    new Date(b.month).getTime() - new Date(a.month).getTime()
  )[0]
  const recentReview = store.performanceReviews.filter(r => r.staffId === staffId).sort((a, b) => 
    new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
  )[0]

  if (!staff) {
    return <div className="p-8">Staff member not found</div>
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {staff.firstName}!</h1>
        <p className="text-muted-foreground mt-1">Your personal dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Annual Leave
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
              <DollarSign className="w-4 h-4" />
              Last Payslip
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayslip ? (
              <>
                <p className="text-2xl font-bold text-green-600">KES {recentPayslip.netSalary.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{recentPayslip.month}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No payslips available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReview ? (
              <>
                <p className="text-2xl font-bold text-purple-600">{recentReview.rating}/5</p>
                <p className="text-xs text-muted-foreground mt-1">{recentReview.reviewPeriod}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Leave Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {balance && (
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

