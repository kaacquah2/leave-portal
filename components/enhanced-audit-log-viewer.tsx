'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Filter, Download, RefreshCw, Calendar, Lock, FileText } from 'lucide-react'
import { apiRequest } from '@/lib/api'
import { toast } from 'sonner'

interface AuditLog {
  id: string
  action: string
  user: string
  userRole?: string
  staffId?: string
  leaveRequestId?: string
  details: string
  timestamp: string
  ip?: string
  userAgent?: string
  metadata?: any
}

interface DataAccessLog {
  id: string
  userId: string
  userRole: string
  staffId?: string
  dataType: string
  action: string
  timestamp: string
  ip?: string
  userAgent?: string
  metadata?: any
}

export default function EnhancedAuditLogViewer() {
  const [activeTab, setActiveTab] = useState('audit')
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [dataAccessLogs, setDataAccessLogs] = useState<DataAccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [dataTypeFilter, setDataTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [limit, setLimit] = useState(100)
  const [offset, setOffset] = useState(0)
  const [totalAudit, setTotalAudit] = useState(0)
  const [totalDataAccess, setTotalDataAccess] = useState(0)

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      if (actionFilter) params.append('action', actionFilter)
      if (userFilter) params.append('user', userFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await apiRequest(`/api/admin/audit-logs?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      setAuditLogs(data.logs || [])
      setTotalAudit(data.total || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs')
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchDataAccessLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      if (dataTypeFilter) params.append('dataType', dataTypeFilter)
      if (userFilter) params.append('userId', userFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await apiRequest(`/api/reports/data-access?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch data access logs')
      }

      const data = await response.json()
      setDataAccessLogs(data.logs || [])
      setTotalDataAccess(data.summary?.totalAccessEvents || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load data access logs')
      toast.error('Failed to load data access logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs()
    } else {
      fetchDataAccessLogs()
    }
  }, [limit, offset, actionFilter, userFilter, dataTypeFilter, startDate, endDate, activeTab])

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      log.action.toLowerCase().includes(search) ||
      log.user.toLowerCase().includes(search) ||
      log.details.toLowerCase().includes(search) ||
      (log.staffId && log.staffId.toLowerCase().includes(search))
    )
  })

  const filteredDataAccessLogs = dataAccessLogs.filter((log) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      log.dataType.toLowerCase().includes(search) ||
      log.userId.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      (log.staffId && log.staffId.toLowerCase().includes(search))
    )
  })

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('APPROVE')) return 'bg-green-100 text-green-800'
    if (action.includes('UPDATE') || action.includes('MODIFY')) return 'bg-blue-100 text-blue-800'
    if (action.includes('DELETE') || action.includes('REJECT') || action.includes('TERMINATE')) return 'bg-red-100 text-red-800'
    if (action.includes('LOGIN') || action.includes('AUTH')) return 'bg-purple-100 text-purple-800'
    if (action.includes('VIEW') || action.includes('ACCESS')) return 'bg-gray-100 text-gray-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getDataTypeColor = (dataType: string) => {
    switch (dataType) {
      case 'staff_profile':
        return 'bg-blue-100 text-blue-800'
      case 'salary':
        return 'bg-purple-100 text-purple-800'
      case 'medical_attachment':
        return 'bg-red-100 text-red-800'
      case 'dob':
        return 'bg-yellow-100 text-yellow-800'
      case 'performance_review':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const exportLogs = async (type: 'audit' | 'data-access') => {
    try {
      const logs = type === 'audit' ? filteredAuditLogs : filteredDataAccessLogs
      const headers = type === 'audit'
        ? ['Timestamp', 'Action', 'User', 'User Role', 'Staff ID', 'Details', 'IP Address']
        : ['Timestamp', 'User', 'User Role', 'Staff ID', 'Data Type', 'Action', 'IP Address']

      const csv = [
        headers.join(','),
        ...logs.map((log) => {
          if (type === 'audit') {
            const auditLog = log as AuditLog
            return [
              auditLog.timestamp,
              auditLog.action,
              auditLog.user,
              auditLog.userRole || '',
              auditLog.staffId || '',
              `"${auditLog.details.replace(/"/g, '""')}"`,
              auditLog.ip || '',
            ].join(',')
          } else {
            const dataLog = log as DataAccessLog
            return [
              dataLog.timestamp,
              dataLog.userId,
              dataLog.userRole,
              dataLog.staffId || '',
              dataLog.dataType,
              dataLog.action,
              dataLog.ip || '',
            ].join(',')
          }
        }),
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-logs-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`${type === 'audit' ? 'Audit' : 'Data access'} logs exported successfully`)
    } catch (err) {
      toast.error(`Failed to export ${type === 'audit' ? 'audit' : 'data access'} logs`)
    }
  }

  const uniqueActions = Array.from(new Set(auditLogs.map((log) => log.action))).sort()
  const uniqueDataTypes = Array.from(new Set(dataAccessLogs.map((log) => log.dataType))).sort()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Audit Log Viewer</h1>
          <p className="text-muted-foreground mt-1">
            View system activity, audit logs, and data access logs (Data Protection Act 843)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => activeTab === 'audit' ? exportLogs('audit') : exportLogs('data-access')}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => activeTab === 'audit' ? fetchAuditLogs() : fetchDataAccessLogs()}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="w-4 h-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="data-access" className="gap-2">
            <Lock className="w-4 h-4" />
            Data Access Logs (Act 843)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter audit logs by action, user, or date range</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div>
                  <select
                    value={actionFilter}
                    onChange={(e) => {
                      setActionFilter(e.target.value)
                      setOffset(0)
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">All Actions</option>
                    {uniqueActions.map((action) => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Input
                    placeholder="Filter by user email..."
                    value={userFilter}
                    onChange={(e) => {
                      setUserFilter(e.target.value)
                      setOffset(0)
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="Start date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setOffset(0)
                    }}
                  />
                  <Input
                    type="date"
                    placeholder="End date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setOffset(0)
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                Showing {filteredAuditLogs.length} of {totalAudit} logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Loading audit logs...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600">{error}</p>
                  <Button onClick={fetchAuditLogs} className="mt-4">
                    Retry
                  </Button>
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No audit logs found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Timestamp</th>
                          <th className="text-left p-3 font-medium">Action</th>
                          <th className="text-left p-3 font-medium">User</th>
                          <th className="text-left p-3 font-medium">Role</th>
                          <th className="text-left p-3 font-medium">Staff ID</th>
                          <th className="text-left p-3 font-medium">Details</th>
                          <th className="text-left p-3 font-medium">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAuditLogs.map((log) => (
                          <tr key={log.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {formatDate(log.timestamp)}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                            </td>
                            <td className="p-3 text-sm">{log.user}</td>
                            <td className="p-3 text-sm">
                              {log.userRole ? (
                                <Badge variant="outline">{log.userRole}</Badge>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-3 text-sm">{log.staffId || '-'}</td>
                            <td className="p-3 text-sm max-w-md truncate" title={log.details}>
                              {log.details}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">{log.ip || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalAudit > limit && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {offset + 1} to {Math.min(offset + limit, totalAudit)} of {totalAudit} logs
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setOffset(Math.max(0, offset - limit))}
                          disabled={offset === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setOffset(offset + limit)}
                          disabled={offset + limit >= totalAudit}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Filter data access logs (Data Protection Act 843 compliance)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div>
                  <select
                    value={dataTypeFilter}
                    onChange={(e) => {
                      setDataTypeFilter(e.target.value)
                      setOffset(0)
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">All Data Types</option>
                    {uniqueDataTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Input
                    placeholder="Filter by user ID..."
                    value={userFilter}
                    onChange={(e) => {
                      setUserFilter(e.target.value)
                      setOffset(0)
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="Start date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setOffset(0)
                    }}
                  />
                  <Input
                    type="date"
                    placeholder="End date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setOffset(0)
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Access Logs (Data Protection Act 843)</CardTitle>
              <CardDescription>
                All access to sensitive personal data is logged for compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Loading data access logs...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600">{error}</p>
                  <Button onClick={fetchDataAccessLogs} className="mt-4">
                    Retry
                  </Button>
                </div>
              ) : filteredDataAccessLogs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No data access logs found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Timestamp</th>
                          <th className="text-left p-3 font-medium">User</th>
                          <th className="text-left p-3 font-medium">Role</th>
                          <th className="text-left p-3 font-medium">Staff ID</th>
                          <th className="text-left p-3 font-medium">Data Type</th>
                          <th className="text-left p-3 font-medium">Action</th>
                          <th className="text-left p-3 font-medium">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDataAccessLogs.map((log) => (
                          <tr key={log.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {formatDate(log.timestamp)}
                              </div>
                            </td>
                            <td className="p-3 text-sm">{log.userId}</td>
                            <td className="p-3 text-sm">
                              <Badge variant="outline">{log.userRole}</Badge>
                            </td>
                            <td className="p-3 text-sm">{log.staffId || '-'}</td>
                            <td className="p-3">
                              <Badge className={getDataTypeColor(log.dataType)}>
                                {log.dataType}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">{log.ip || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalDataAccess > limit && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {offset + 1} to {Math.min(offset + limit, totalDataAccess)} of {totalDataAccess} logs
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setOffset(Math.max(0, offset - limit))}
                          disabled={offset === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setOffset(offset + limit)}
                          disabled={offset + limit >= totalDataAccess}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

