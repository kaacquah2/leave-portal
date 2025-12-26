'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'

interface LeaveCalendarViewProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  userRole?: 'hr' | 'manager' | 'employee'
  staffId?: string
}

export default function LeaveCalendarView({ store, userRole, staffId }: LeaveCalendarViewProps) {
  // Get leaves based on role
  let leaves = store.leaves
  if (userRole === 'employee' && staffId) {
    leaves = leaves.filter((l: any) => l.staffId === staffId)
  } else if (userRole === 'manager') {
    // In production, filter by manager's team
    leaves = leaves.filter((l: any) => l.status === 'pending' || l.status === 'approved')
  }

  // Group leaves by month
  const leavesByMonth: Record<string, typeof leaves> = {}
  leaves.forEach((leave: any) => {
    const month = new Date(leave.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!leavesByMonth[month]) {
      leavesByMonth[month] = []
    }
    leavesByMonth[month].push(leave)
  })

  // Get holidays for the year
  const currentYear = new Date().getFullYear()
  const holidays = store.holidays.filter((h: any) => {
    if (h.recurring) return true
    return h.year === currentYear
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Calendar</h1>
        <p className="text-muted-foreground mt-1">View all leaves and holidays on a calendar</p>
      </div>

      {/* Holidays Section */}
      <Card className="border-2 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Holidays {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {holidays
              .sort((a: any, b: any) => {
                const dateA = new Date(a.date)
                const dateB = new Date(b.date)
                // For recurring holidays, use current year
                if (a.recurring) dateA.setFullYear(currentYear)
                if (b.recurring) dateB.setFullYear(currentYear)
                return dateA.getTime() - dateB.getTime()
              })
              .map((holiday: any) => {
                const holidayDate = new Date(holiday.date)
                if (holiday.recurring) holidayDate.setFullYear(currentYear)
                return (
                  <div key={holiday.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{holiday.name}</p>
                      <Badge variant="outline" className="text-xs">{holiday.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {holidayDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Leaves by Month */}
      {Object.entries(leavesByMonth)
        .sort(([monthA], [monthB]) => {
          const dateA = new Date(monthA + ' 1, ' + currentYear)
          const dateB = new Date(monthB + ' 1, ' + currentYear)
          return dateA.getTime() - dateB.getTime()
        })
        .map(([month, monthLeaves]) => (
          <Card key={month} className="border-2 border-green-200">
            <CardHeader>
              <CardTitle>{month}</CardTitle>
              <CardDescription>{monthLeaves.length} leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monthLeaves
                  .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((leave: any) => {
                    const startDate = new Date(leave.startDate)
                    const endDate = new Date(leave.endDate)
                    return (
                      <div
                        key={leave.id}
                        className={`border rounded-lg p-3 ${getStatusColor(leave.status)}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{leave.staffName}</span>
                            <Badge variant="outline" className="text-xs">{leave.leaveType}</Badge>
                            <Badge variant="outline" className="text-xs capitalize">{leave.status}</Badge>
                          </div>
                          <span className="text-sm font-medium">{leave.days} days</span>
                        </div>
                        <p className="text-xs">
                          {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                          {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {leave.reason && (
                          <p className="text-xs mt-1 opacity-75">{leave.reason}</p>
                        )}
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}

