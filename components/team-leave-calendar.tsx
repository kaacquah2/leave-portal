'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Calendar as CalendarIcon, 
  Filter, 
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { type UserRole } from '@/lib/permissions'
import { apiRequest } from '@/lib/api-config'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns'
import { getLeaveTypeColor } from '@/lib/calendar-utils'

interface TeamLeaveCalendarProps {
  userRole: UserRole
  staffId?: string
  department?: string
  unit?: string
  view?: 'month' | 'week' | 'day'
}

interface LeaveEvent {
  id: string
  staffId: string
  staffName: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  status: string
  department: string
  unit: string
  position: string
}

export default function TeamLeaveCalendar({
  userRole,
  staffId,
  department,
  unit,
  view = 'month',
}: TeamLeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [leaves, setLeaves] = useState<LeaveEvent[]>([])
  const [holidays, setHolidays] = useState<Array<{ id: string; name: string; date: string; type: string }>>([])
  const [conflicts, setConflicts] = useState<Array<{ date: string; level: string; staffOnLeave: number }>>([])
  const [weekends, setWeekends] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDepartment, setSelectedDepartment] = useState<string>(department || '')
  const [selectedUnit, setSelectedUnit] = useState<string>(unit || '')
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('')

  useEffect(() => {
    fetchCalendarData()
  }, [currentDate, selectedDepartment, selectedUnit, selectedLeaveType])

  const fetchCalendarData = async () => {
    try {
      setLoading(true)
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      
      const params = new URLSearchParams({
        startDate: format(monthStart, 'yyyy-MM-dd'),
        endDate: format(monthEnd, 'yyyy-MM-dd'),
      })
      
      if (selectedDepartment) params.append('department', selectedDepartment)
      if (selectedUnit) params.append('unit', selectedUnit)
      if (selectedLeaveType) params.append('leaveType', selectedLeaveType)
      
      const response = await apiRequest(`/api/calendar/leave-calendar?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLeaves(data.leaves || [])
        setHolidays(data.holidays || [])
        setWeekends(data.weekends || [])
      }
      
      // Fetch conflicts
      const conflictResponse = await apiRequest(`/api/calendar/conflicts?${params.toString()}`)
      if (conflictResponse.ok) {
        const conflictData = await conflictResponse.json()
        setConflicts(conflictData.conflicts || [])
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Get first day of week for the month
  const firstDayOfWeek = monthStart.getDay()
  const daysBeforeMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Monday = 0
  
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  const getLeavesForDate = (date: Date): LeaveEvent[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return leaves.filter(leave => {
      const start = parseISO(leave.startDate)
      const end = parseISO(leave.endDate)
      return date >= start && date <= end
    })
  }

  const isHoliday = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return holidays.some(h => h.date === dateStr)
  }

  const isWeekend = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return weekends.includes(dateStr)
  }

  const getConflictForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return conflicts.find(c => c.date === dateStr)
  }

  const getHolidayName = (date: Date): string | null => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const holiday = holidays.find(h => h.date === dateStr)
    return holiday ? holiday.name : null
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Team Leave Calendar
              </CardTitle>
              <CardDescription>
                View leave requests across your team/department
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Department</Label>
              <Input
                placeholder="Filter by department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Unit</Label>
              <Input
                placeholder="Filter by unit"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Leave Type</Label>
              <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Sick">Sick</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Maternity">Maternity</SelectItem>
                  <SelectItem value="Paternity">Paternity</SelectItem>
                  <SelectItem value="Compassionate">Compassionate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-muted-foreground">Loading calendar...</div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 bg-muted/50">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7">
                {/* Empty cells before month start */}
                {Array.from({ length: daysBeforeMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[100px] border-r border-b last:border-r-0 bg-muted/20" />
                ))}

                {/* Month days */}
                {daysInMonth.map((date) => {
                  const dateLeaves = getLeavesForDate(date)
                  const conflict = getConflictForDate(date)
                  const holiday = getHolidayName(date)
                  const isWeekendDay = isWeekend(date)
                  const isToday = isSameDay(date, new Date())

                  return (
                    <div
                      key={format(date, 'yyyy-MM-dd')}
                      className={`min-h-[100px] border-r border-b last:border-r-0 p-1 ${
                        isWeekendDay ? 'bg-muted/30' : 'bg-background'
                      } ${!isSameMonth(date, currentDate) ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-medium ${
                            isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''
                          }`}
                        >
                          {format(date, 'd')}
                        </span>
                        {conflict && (
                          <Badge
                            variant={conflict.level === 'critical' ? 'destructive' : conflict.level === 'high' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {conflict.staffOnLeave}
                          </Badge>
                        )}
                      </div>
                      {holiday && (
                        <div className="text-xs text-blue-600 font-medium mb-1 truncate" title={holiday}>
                          {holiday}
                        </div>
                      )}
                      <div className="space-y-1">
                        {dateLeaves.slice(0, 3).map((leave) => (
                          <div
                            key={leave.id}
                            className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                            style={{
                              backgroundColor: getLeaveTypeColor(leave.leaveType) + '20',
                              color: getLeaveTypeColor(leave.leaveType),
                              borderLeft: `3px solid ${getLeaveTypeColor(leave.leaveType)}`,
                            }}
                            title={`${leave.staffName} - ${leave.leaveType} (${leave.days} days)`}
                          >
                            {leave.staffName.split(' ')[0]} - {leave.leaveType}
                          </div>
                        ))}
                        {dateLeaves.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dateLeaves.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getLeaveTypeColor('Annual') }} />
              <span>Annual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getLeaveTypeColor('Sick') }} />
              <span>Sick</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getLeaveTypeColor('Training') }} />
              <span>Training</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span>Conflict</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

