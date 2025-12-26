'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, FileText, Table, Settings } from 'lucide-react'

interface ReportBuilderProps {
  userRole: string
}

const REPORT_TYPES = [
  { value: 'leave-requests', label: 'Leave Requests' },
  { value: 'staff-directory', label: 'Staff Directory' },
  { value: 'leave-utilization', label: 'Leave Utilization' },
]

const DEFAULT_COLUMNS: Record<string, Array<{ key: string; label: string }>> = {
  'leave-requests': [
    { key: 'staffName', label: 'Staff Name' },
    { key: 'department', label: 'Department' },
    { key: 'leaveType', label: 'Leave Type' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'days', label: 'Days' },
    { key: 'status', label: 'Status' },
    { key: 'reason', label: 'Reason' },
  ],
  'staff-directory': [
    { key: 'staffId', label: 'Staff ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'position', label: 'Position' },
    { key: 'grade', label: 'Grade' },
    { key: 'joinDate', label: 'Join Date' },
  ],
  'leave-utilization': [
    { key: 'staffName', label: 'Staff Name' },
    { key: 'department', label: 'Department' },
    { key: 'leaveType', label: 'Leave Type' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'days', label: 'Days' },
  ],
}

export default function ReportBuilder({ userRole }: ReportBuilderProps) {
  const [reportType, setReportType] = useState('leave-requests')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [department, setDepartment] = useState('all')
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all')
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('excel')
  const [loading, setLoading] = useState(false)

  // Initialize selected columns
  useEffect(() => {
    if (DEFAULT_COLUMNS[reportType]) {
      setSelectedColumns(DEFAULT_COLUMNS[reportType].map((col) => col.key))
    }
  }, [reportType])

  // Fetch departments
  useEffect(() => {
    fetch('/api/staff', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const depts = [...new Set(data.map((s: any) => s.department))].sort() as string[]
        setDepartments(depts)
      })
      .catch(console.error)
  }, [])

  // Set default date range
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 3)
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((key) => key !== columnKey)
        : [...prev, columnKey]
    )
  }

  const handleGenerateReport = async () => {
    if (selectedColumns.length === 0) {
      alert('Please select at least one column')
      return
    }

    setLoading(true)
    try {
      const filters: any = {}
      if (statusFilter !== 'all') filters.status = statusFilter
      if (leaveTypeFilter !== 'all') filters.leaveType = leaveTypeFilter

      const columns = DEFAULT_COLUMNS[reportType].filter((col) =>
        selectedColumns.includes(col.key)
      )

      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          format: exportFormat,
          reportType,
          startDate,
          endDate,
          department,
          columns,
          filters,
        }),
      })

      if (exportFormat === 'excel') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${reportType}_${Date.now()}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        // PDF generation
        const { reportData } = await response.json()
        const { generatePDFReport, downloadFile } = await import('@/lib/report-generator')
        const blob = await generatePDFReport(reportData)
        downloadFile(blob, `${reportType}_${Date.now()}.pdf`)
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const availableColumns = DEFAULT_COLUMNS[reportType] || []

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Custom Report Builder</h1>
        <p className="text-muted-foreground">Create custom reports with your preferred columns and filters</p>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="columns">
            <Table className="mr-2 h-4 w-4" />
            Columns
          </TabsTrigger>
          <TabsTrigger value="preview">
            <FileText className="mr-2 h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>Configure your report settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={(value) => {
                  setReportType(value)
                  setSelectedColumns(DEFAULT_COLUMNS[value]?.map((col) => col.key) || [])
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {reportType === 'leave-requests' && (
                <>
                  <div>
                    <Label htmlFor="status">Status Filter</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="leaveType">Leave Type Filter</Label>
                    <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Leave Types</SelectItem>
                        <SelectItem value="Annual">Annual</SelectItem>
                        <SelectItem value="Sick">Sick</SelectItem>
                        <SelectItem value="Study">Study</SelectItem>
                        <SelectItem value="Maternity">Maternity</SelectItem>
                        <SelectItem value="Paternity">Paternity</SelectItem>
                        <SelectItem value="Compassionate">Compassionate</SelectItem>
                        <SelectItem value="Training">Training</SelectItem>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="exportFormat">Export Format</Label>
                <Select value={exportFormat} onValueChange={(value: 'pdf' | 'excel') => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Columns Tab */}
        <TabsContent value="columns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Columns</CardTitle>
              <CardDescription>Choose which columns to include in your report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableColumns.map((column) => (
                  <div key={column.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={column.key}
                      checked={selectedColumns.includes(column.key)}
                      onCheckedChange={() => handleColumnToggle(column.key)}
                    />
                    <Label
                      htmlFor={column.key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {column.label}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedColumns.length === 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Please select at least one column
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>Review your report configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Report Type:</span>
                  <span>{REPORT_TYPES.find((t) => t.value === reportType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date Range:</span>
                  <span>
                    {startDate && endDate
                      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                      : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Department:</span>
                  <span>{department === 'all' ? 'All Departments' : department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Selected Columns:</span>
                  <span>{selectedColumns.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Export Format:</span>
                  <span>{exportFormat.toUpperCase()}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleGenerateReport}
                  disabled={loading || selectedColumns.length === 0}
                  className="w-full"
                >
                  {loading ? (
                    'Generating...'
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Generate & Download Report
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

