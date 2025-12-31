'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Download, RefreshCw, Calendar } from 'lucide-react'
import { apiRequest } from '@/lib/api-config'
import { toast } from 'sonner'

interface AuditLog {
  id: string
  action: string
  user: string
  staffId?: string
  details: string
  timestamp: string
  ip?: string
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [limit, setLimit] = useState(100)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      if (actionFilter) params.append('action', actionFilter)
      if (userFilter) params.append('user', userFilter)

      const response = await apiRequest(`/api/admin/audit-logs?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs')
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [limit, offset, actionFilter, userFilter])

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      log.action.toLowerCase().includes(search) ||
      log.user.toLowerCase().includes(search) ||
      log.details.toLowerCase().includes(search) ||
      (log.staffId && log.staffId.toLowerCase().includes(search))
    )
  })

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('APPROVE')) return 'bg-green-100 text-green-800'
    if (action.includes('UPDATE') || action.includes('MODIFY')) return 'bg-blue-100 text-blue-800'
    if (action.includes('DELETE') || action.includes('REJECT') || action.includes('TERMINATE')) return 'bg-red-100 text-red-800'
    if (action.includes('LOGIN') || action.includes('AUTH')) return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
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

  const exportLogs = async () => {
    try {
      const csv = [
        ['Action', 'User', 'Staff ID', 'Details', 'Timestamp', 'IP'].join(','),
        ...filteredLogs.map((log) =>
          [
            log.action,
            log.user,
            log.staffId || '',
            `"${log.details.replace(/"/g, '""')}"`,
            log.timestamp,
            log.ip || '',
          ].join(',')
        ),
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Audit logs exported successfully')
    } catch (err) {
      toast.error('Failed to export audit logs')
    }
  }

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action))).sort()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">View system activity and user actions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportLogs} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={fetchLogs} className="gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter audit logs by action, user, or search term</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {total} logs
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
              <Button onClick={fetchLogs} className="mt-4">
                Retry
              </Button>
            </div>
          ) : filteredLogs.length === 0 ? (
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
                      <th className="text-left p-3 font-medium">Staff ID</th>
                      <th className="text-left p-3 font-medium">Details</th>
                      <th className="text-left p-3 font-medium">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
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

              {total > limit && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} logs
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
                      disabled={offset + limit >= total}
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
    </div>
  )
}

