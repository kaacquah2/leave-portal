'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react'
import { type UserRole } from '@/lib/permissions'
import { apiRequest } from '@/lib/api-config'
import { format, subDays, addDays, parseISO } from 'date-fns'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface WorkforceAvailabilityDashboardProps {
  userRole: UserRole
  staffId?: string
  department?: string
  unit?: string
}

interface TodayAvailability {
  date: string
  totalStaff: number
  staffOnLeaveCount: number
  staffAvailable: number
  availabilityRate: number
  staffOnLeave: Array<{
    staffId: string
    staffName: string
    department: string
    unit: string
    position: string
    leaveType: string
    startDate: string
    endDate: string
    days: number
  }>
  byDepartment: Array<{
    department: string
    totalStaff: number
    staffOnLeave: number
    availabilityRate: number
  }>
  byUnit: Array<{
    unit: string
    totalStaff: number
    staffOnLeave: number
    availabilityRate: number
  }>
}

interface UpcomingAbsence {
  date: string
  staffId: string
  staffName: string
  position: string
  department: string
  unit: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  isCritical: boolean
  coverageAvailable: boolean
}

export default function WorkforceAvailabilityDashboard({
  userRole,
  staffId,
  department,
  unit,
}: WorkforceAvailabilityDashboardProps) {
  const [todayData, setTodayData] = useState<TodayAvailability | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingAbsence[]>([])
  const [density, setDensity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    fetchAvailabilityData()
  }, [selectedDate, department, unit])

  const fetchAvailabilityData = async () => {
    try {
      setLoading(true)
      
      // Fetch today's availability
      const todayParams = new URLSearchParams({
        date: format(selectedDate, 'yyyy-MM-dd'),
      })
      if (department) todayParams.append('department', department)
      if (unit) todayParams.append('unit', unit)
      
      const todayResponse = await apiRequest(`/api/availability/today?${todayParams.toString()}`)
      if (todayResponse.ok) {
        const todayData = await todayResponse.json()
        setTodayData(todayData)
      }
      
      // Fetch upcoming absences
      const upcomingParams = new URLSearchParams({
        days: '30',
      })
      if (department) upcomingParams.append('department', department)
      if (unit) upcomingParams.append('unit', unit)
      
      const upcomingResponse = await apiRequest(`/api/availability/upcoming?${upcomingParams.toString()}`)
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json()
        setUpcoming(upcomingData.upcoming || [])
      }
      
      // Fetch density analytics
      const startDate = format(subDays(selectedDate, 30), 'yyyy-MM-dd')
      const endDate = format(addDays(selectedDate, 30), 'yyyy-MM-dd')
      const densityParams = new URLSearchParams({
        startDate,
        endDate,
        granularity: 'day',
      })
      if (department) densityParams.append('department', department)
      if (unit) densityParams.append('unit', unit)
      
      const densityResponse = await apiRequest(`/api/availability/density?${densityParams.toString()}`)
      if (densityResponse.ok) {
        const densityData = await densityResponse.json()
        setDensity(densityData.density || [])
      }
    } catch (error) {
      console.error('Error fetching availability data:', error)
    } finally {
      setLoading(false)
    }
  }

  const criticalAbsences = upcoming.filter(a => a.isCritical).slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Today's Availability Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayData?.totalStaff || 0}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{todayData?.staffOnLeaveCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {todayData?.totalStaff ? Math.round((todayData.staffOnLeaveCount / todayData.totalStaff) * 100) : 0}% of staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayData?.staffAvailable || 0}</div>
            <p className="text-xs text-muted-foreground">
              {todayData?.availabilityRate.toFixed(1) || 0}% availability rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAbsences.length}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff On Leave Today */}
      <Card>
        <CardHeader>
          <CardTitle>Staff On Leave Today</CardTitle>
          <CardDescription>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : todayData?.staffOnLeave.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff on leave today
            </div>
          ) : (
            <div className="space-y-2">
              {todayData?.staffOnLeave.map((staff) => (
                <div
                  key={staff.staffId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{staff.staffName}</div>
                    <div className="text-sm text-muted-foreground">
                      {staff.position} • {staff.department} • {staff.unit}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {staff.leaveType} • {format(parseISO(staff.startDate), 'MMM d')} - {format(parseISO(staff.endDate), 'MMM d')} ({staff.days} days)
                    </div>
                  </div>
                  <Badge variant="outline">{staff.leaveType}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Critical Absences */}
      {criticalAbsences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Upcoming Critical Absences
            </CardTitle>
            <CardDescription>
              Critical roles with upcoming leave in the next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalAbsences.map((absence) => (
                <div
                  key={`${absence.staffId}-${absence.startDate}`}
                  className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{absence.staffName}</div>
                    <div className="text-sm text-muted-foreground">
                      {absence.position} • {absence.department}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(absence.startDate), 'MMM d')} - {format(parseISO(absence.endDate), 'MMM d')} ({absence.days} days)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {absence.coverageAvailable ? (
                      <Badge variant="outline" className="bg-green-50">
                        Coverage Available
                      </Badge>
                    ) : (
                      <Badge variant="destructive">No Coverage</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability by Department/Unit */}
      {todayData && (todayData.byDepartment.length > 0 || todayData.byUnit.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {todayData.byDepartment.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>By Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todayData.byDepartment.map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{dept.department}</div>
                        <div className="text-sm text-muted-foreground">
                          {dept.totalStaff - dept.staffOnLeave} / {dept.totalStaff} available
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{dept.availabilityRate.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">available</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {todayData.byUnit.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>By Unit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todayData.byUnit.map((unit) => (
                    <div key={unit.unit} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{unit.unit}</div>
                        <div className="text-sm text-muted-foreground">
                          {unit.totalStaff - unit.staffOnLeave} / {unit.totalStaff} available
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{unit.availabilityRate.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">available</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Leave Density Chart */}
      {density.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Leave Density Analytics
            </CardTitle>
            <CardDescription>
              Staff on leave over the next 60 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={density.slice(0, 60)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(parseISO(value), 'MMM d, yyyy')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgStaffOnLeave" 
                  stroke="#ef4444" 
                  name="Staff on Leave"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="availabilityRate" 
                  stroke="#10b981" 
                  name="Availability %"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

