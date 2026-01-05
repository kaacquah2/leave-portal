'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Lazy load Recharts to reduce initial bundle size (~200KB)
import dynamic from 'next/dynamic'
import { Calendar, Download, TrendingUp, Users, CalendarDays, DollarSign, BarChart3 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts'

interface AnalyticsData {
  summary?: {
    totalLeaves: number
    approvedLeaves: number
    pendingLeaves: number
    rejectedLeaves: number
    totalApprovedDays: number
    avgLeaveDuration: number
    approvalRate: number
    totalStaff: number
    activeStaff?: number
  }
  utilizationTrends?: Array<{ month: string; days: number; count: number }>
  departmentComparison?: Array<{
    department: string
    totalLeaves: number
    totalDays: number
    approvedLeaves: number
    approvedDays: number
    pendingLeaves: number
    staffCount: number
    avgDaysPerStaff: number
  }>
  costAnalysis?: {
    totalCost: number
    totalDays: number
    byDepartment: Array<{ department: string; totalCost: number; days: number }>
    byLeaveType: Array<{ leaveType: string; totalCost: number; days: number }>
    avgDailyCost: number
  }
  predictive?: {
    peakMonths: Array<{ month: number; monthName: string; days: number }>
    monthlyPattern: Array<{ month: number; monthName: string; days: number }>
    dayOfWeekPattern: Array<{ day: number; dayName: string; count: number }>
    leaveTypePattern: Array<{ type: string; days: number }>
  }
}

interface AnalyticsDashboardProps {
  userRole: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']

export default function AnalyticsDashboard({ userRole }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({})
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [department, setDepartment] = useState('all')
  const [departments, setDepartments] = useState<string[]>([])

  // Set default date range (last 12 months)
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 12)
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  // Fetch departments
  useEffect(() => {
    (async () => {
      try {
        const { apiRequest } = await import('@/lib/api-config')
        const res = await apiRequest('/api/staff')
        const data = await res.json()
        const depts = [...new Set(data.map((s: any) => s.department))].sort() as string[]
        setDepartments(depts)
      } catch (error) {
        console.error('Error fetching departments:', error)
      }
    })()
  }, [])

  // Fetch analytics
  useEffect(() => {
    if (!startDate || !endDate) return

    setLoading(true)
    const params = new URLSearchParams({
      startDate,
      endDate,
      department,
      metric: 'all',
    })

    ;(async () => {
      try {
        const { apiRequest, API_BASE_URL } = await import('@/lib/api-config')
        console.log('[AnalyticsDashboard] Fetching analytics. API Base URL:', API_BASE_URL || 'relative');
        
        const response = await apiRequest(`/api/reports/analytics?${params}`, {
          credentials: 'include',
        })
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('[AnalyticsDashboard] API error:', response.status, errorText);
          throw new Error(`Failed to fetch analytics: ${response.status} ${errorText}`)
        }
        
        const data = await response.json()
        setAnalytics(data)
      } catch (error) {
        console.error('[AnalyticsDashboard] Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [startDate, endDate, department])

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/reports/export', {
        method: 'POST',
        body: JSON.stringify({
          format,
          reportType: 'leave-requests',
          startDate,
          endDate,
          department,
        }),
      })

      if (format === 'excel') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Analytics_Report_${Date.now()}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        // PDF generation handled client-side
        const { reportData } = await response.json()
        const { generatePDFReport, downloadFile } = await import('@/lib/report-generator')
        const blob = await generatePDFReport(reportData)
        downloadFile(blob, `Analytics_Report_${Date.now()}.pdf`)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Advanced reporting and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {analytics.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Leaves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.totalLeaves}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.summary.approvedLeaves} approved
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.totalApprovedDays}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: {analytics.summary.avgLeaveDuration.toFixed(1)} days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approval Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.approvalRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.summary.pendingLeaves} pending
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.summary.totalStaff}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.summary.activeStaff} active
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="utilization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="utilization">Utilization Trends</TabsTrigger>
          <TabsTrigger value="department">Department Comparison</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Analytics</TabsTrigger>
        </TabsList>

        {/* Utilization Trends */}
        <TabsContent value="utilization" className="space-y-4">
          {analytics.utilizationTrends && analytics.utilizationTrends.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Leave Utilization Over Time</CardTitle>
                  <CardDescription>Monthly leave days and request count</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.utilizationTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="days" stroke="#0088FE" name="Days" />
                      <Line yAxisId="right" type="monotone" dataKey="count" stroke="#00C49F" name="Requests" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No utilization data available for the selected period
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Department Comparison */}
        <TabsContent value="department" className="space-y-4">
          {analytics.departmentComparison && analytics.departmentComparison.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Department Comparison</CardTitle>
                  <CardDescription>Leave statistics by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={analytics.departmentComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="approvedDays" fill="#00C49F" name="Approved Days" />
                      <Bar dataKey="pendingLeaves" fill="#FFBB28" name="Pending Requests" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Average Days per Staff</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.departmentComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="avgDaysPerStaff" fill="#8884d8" name="Avg Days/Staff" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No department data available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="cost" className="space-y-4">
          {analytics.costAnalysis ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      GHS {analytics.costAnalysis.totalCost.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {analytics.costAnalysis.totalDays} total days
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Average Daily Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      GHS {analytics.costAnalysis.avgDailyCost.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Cost per Day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      GHS {(
                        analytics.costAnalysis.totalCost / analytics.costAnalysis.totalDays || 0
                      ).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cost by Department</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.costAnalysis.byDepartment}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => `GHS ${value.toLocaleString()}`} />
                        <Bar dataKey="totalCost" fill="#FF8042" name="Total Cost (GHS)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cost by Leave Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.costAnalysis.byLeaveType}
                          dataKey="totalCost"
                          nameKey="leaveType"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {analytics.costAnalysis.byLeaveType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `GHS ${value.toLocaleString()}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No cost analysis data available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Predictive Analytics */}
        <TabsContent value="predictive" className="space-y-4">
          {analytics.predictive ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Peak Leave Periods</CardTitle>
                  <CardDescription>Months with highest leave utilization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.predictive.peakMonths.map((peak, index) => (
                      <div key={peak.month} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-muted-foreground">#{index + 1}</div>
                          <div>
                            <div className="font-semibold">{peak.monthName}</div>
                            <div className="text-sm text-muted-foreground">{peak.days} days</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Pattern</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.predictive.monthlyPattern}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="monthName" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="days" fill="#8884d8" name="Days" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Leave Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.predictive.leaveTypePattern}
                          dataKey="days"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {analytics.predictive.leaveTypePattern.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No predictive analytics data available
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

