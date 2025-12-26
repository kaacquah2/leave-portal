'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Plus } from 'lucide-react'
import { useState } from 'react'
import LeaveForm from './leave-form'

interface EmployeeLeaveBalancesProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  staffId: string
}

export default function EmployeeLeaveBalances({ store, staffId }: EmployeeLeaveBalancesProps) {
  const [showForm, setShowForm] = useState(false)
  const balance = store.balances.find((b: any) => b.staffId === staffId)
  const staff = store.staff.find((s: any) => s.staffId === staffId)
  const leavePolicies = store.leavePolicies.filter((p: any) => p.active)

  if (!staff || !balance) {
    return <div className="p-8">Staff member not found</div>
  }

  const leaveTypes = [
    { type: 'Annual', balance: balance.annual, color: 'bg-blue-500' },
    { type: 'Sick', balance: balance.sick, color: 'bg-red-500' },
    { type: 'Special Service', balance: balance.specialService, color: 'bg-green-500' },
    { type: 'Training', balance: balance.training, color: 'bg-purple-500' },
    { type: 'Unpaid', balance: balance.unpaid, color: 'bg-gray-500' },
    { type: 'Study', balance: balance.study, color: 'bg-indigo-500' },
    { type: 'Maternity', balance: balance.maternity, color: 'bg-pink-500' },
    { type: 'Paternity', balance: balance.paternity, color: 'bg-cyan-500' },
    { type: 'Compassionate', balance: balance.compassionate, color: 'bg-amber-500' },
  ]

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Balances</h1>
          <p className="text-muted-foreground mt-1">View your available leave days</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaveTypes.map(({ type, balance: bal, color }) => {
          const policy = leavePolicies.find((p: any) => p.leaveType === type)
          return (
            <Card key={type} className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{type}</span>
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                </CardTitle>
                <CardDescription>
                  {policy ? `Max: ${policy.maxDays} days` : 'No policy set'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600">{bal}</p>
                  <p className="text-sm text-muted-foreground mt-2">Days Available</p>
                </div>
                {policy && policy.carryoverAllowed && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Carryover allowed: Up to {policy.maxCarryover} days
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle>Leave Policies</CardTitle>
          <CardDescription>Current leave policies and rules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leavePolicies.map((policy: any) => (
              <div key={policy.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{policy.leaveType} Leave</h4>
                  <Badge variant={policy.active ? 'default' : 'secondary'}>
                    {policy.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>Max Days: {policy.maxDays}</div>
                  <div>Accrual: {policy.accrualRate} days/month</div>
                  <div>Carryover: {policy.carryoverAllowed ? `Yes (max ${policy.maxCarryover})` : 'No'}</div>
                  <div>Approval Levels: {policy.approvalLevels}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

