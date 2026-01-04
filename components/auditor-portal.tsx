/**
 * Internal Auditor Portal - Read-Only Access
 * MoFA Compliance: IAA requirements
 */

'use client'

import { useState, useEffect } from 'react'
import { useDataStore } from '@/lib/data-store'
import Header from '@/components/header'
import { UserRole } from '@/lib/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Download, Eye, FileText, Shield, BarChart3 } from 'lucide-react'
import AuditCoverageDashboard from '@/components/audit-coverage-dashboard'

interface AuditorPortalProps {
  userRole: UserRole
  onLogout: () => void
}

export default function AuditorPortal({ userRole, onLogout }: AuditorPortalProps) {
  const [activeTab, setActiveTab] = useState('audit-logs')
  const store = useDataStore({ enablePolling: true, pollingInterval: 60000, userRole })

  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/admin/audit-logs?limit=500')
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportAuditLogs = async () => {
    try {
      const csv = [
        ['Timestamp', 'Action', 'User', 'Role', 'Staff ID', 'Details'].join(','),
        ...auditLogs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.action,
          log.user,
          log.userRole || '',
          log.staffId || '',
          `"${log.details.replace(/"/g, '""')}"`,
        ].join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting audit logs:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-background to-purple-50/30">
      <Header onLogout={onLogout} userRole={userRole} />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold">Internal Auditor Portal</h1>
          </div>
          <p className="text-muted-foreground">
            Read-only access to all leave records, audit trails, and compliance reports
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="audit-coverage">Audit Coverage</TabsTrigger>
            <TabsTrigger value="leave-records">Leave Records</TabsTrigger>
            <TabsTrigger value="compliance-reports">Compliance Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="audit-logs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Audit Logs</CardTitle>
                  <Button onClick={exportAuditLogs} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading audit logs...</div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Timestamp</th>
                              <th className="text-left p-2">Action</th>
                              <th className="text-left p-2">User</th>
                              <th className="text-left p-2">Role</th>
                              <th className="text-left p-2">Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditLogs.map((log) => (
                              <tr key={log.id} className="border-b hover:bg-muted/50">
                                <td className="p-2">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="p-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                    {log.action}
                                  </span>
                                </td>
                                <td className="p-2">{log.user}</td>
                                <td className="p-2">{log.userRole || 'N/A'}</td>
                                <td className="p-2">{log.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit-coverage">
            <AuditCoverageDashboard />
          </TabsContent>

          <TabsContent value="leave-records">
            <Card>
              <CardHeader>
                <CardTitle>All Leave Records (Read-Only)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {store.leaves.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No leave records found</div>
                  ) : (
                    <div className="space-y-2">
                      {store.leaves.map((leave) => (
                        <div key={leave.id} className="border rounded-lg p-4 hover:bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{leave.staffName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {leave.leaveType} - {leave.days} day(s)
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded text-xs ${
                                leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                                leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {leave.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance-reports">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                    onClick={() => window.open('/api/reports/compliance?type=utilization', '_blank')}
                  >
                    <FileText className="h-6 w-6 mb-2" />
                    <span className="font-semibold">Leave Utilization</span>
                    <span className="text-xs text-muted-foreground">View by directorate/unit/region</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                    onClick={() => window.open('/api/reports/compliance?type=pending', '_blank')}
                  >
                    <Eye className="h-6 w-6 mb-2" />
                    <span className="font-semibold">Pending Approvals</span>
                    <span className="text-xs text-muted-foreground">View pending requests by level</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                    onClick={() => window.open('/api/reports/compliance?type=payroll', '_blank')}
                  >
                    <FileText className="h-6 w-6 mb-2" />
                    <span className="font-semibold">Payroll Impacts</span>
                    <span className="text-xs text-muted-foreground">View unpaid leave impacts</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                    onClick={() => window.open('/api/reports/compliance?type=audit', '_blank')}
                  >
                    <Shield className="h-6 w-6 mb-2" />
                    <span className="font-semibold">Audit Activity</span>
                    <span className="text-xs text-muted-foreground">View audit log summary</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

