'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, Shield, Activity, Database, Server, Settings, AlertCircle, CheckCircle2, Clock, HardDrive, Cpu, Network } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SystemHealth {
  status: 'operational' | 'degraded' | 'down'
  database: boolean
  api: boolean
  uptime: number
  lastBackup?: string
  diskUsage?: number
  memoryUsage?: number
}

interface SystemStats {
  totalUsers: number
  activeUsers: number
  auditLogs: number
  totalStaff: number
  activeStaff: number
  pendingLeaveRequests: number
  systemHealth: SystemHealth
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    auditLogs: 0,
    totalStaff: 0,
    activeStaff: 0,
    pendingLeaveRequests: 0,
    systemHealth: {
      status: 'operational',
      database: true,
      api: true,
      uptime: 0,
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch admin dashboard stats
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const { apiRequest, API_BASE_URL } = await import('@/lib/api-config')
        console.log('[AdminDashboard] Fetching stats. API Base URL:', API_BASE_URL || 'relative');
        
        const [usersRes, auditRes, staffRes, healthRes, leavesRes] = await Promise.all([
          apiRequest('/api/admin/users').catch((err) => {
            console.error('[AdminDashboard] Error fetching users:', err);
            return { ok: false, error: err } as any;
          }),
          apiRequest('/api/admin/audit-logs?limit=1').catch((err) => {
            console.error('[AdminDashboard] Error fetching audit logs:', err);
            return { ok: false, error: err } as any;
          }),
          apiRequest('/api/staff').catch((err) => {
            console.error('[AdminDashboard] Error fetching staff:', err);
            return { ok: false, error: err } as any;
          }),
          apiRequest('/api/admin/system/health').catch((err) => {
            console.error('[AdminDashboard] Error fetching system health:', err);
            return { ok: false, error: err } as any;
          }),
          apiRequest('/api/leaves?status=pending').catch((err) => {
            console.error('[AdminDashboard] Error fetching pending leaves:', err);
            return { ok: false, error: err } as any;
          })
        ])

        if (usersRes.ok) {
          const users = await usersRes.json()
          setStats(prev => ({
            ...prev,
            totalUsers: users.length || 0,
            activeUsers: users.filter((u: any) => u.active).length || 0
          }))
        } else {
          let errorMsg = 'Failed to fetch users'
          try {
            if (usersRes instanceof Response) {
              const errorData = await usersRes.json().catch(() => ({}))
              errorMsg = errorData.error || errorMsg
            } else if ((usersRes as any).error) {
              errorMsg = (usersRes as any).error?.message || String((usersRes as any).error)
            }
          } catch (e) {
            // Ignore parsing errors
          }
          console.error('[AdminDashboard] Failed to fetch users:', errorMsg)
          setError(errorMsg)
        }

        if (auditRes.ok) {
          const auditData = await auditRes.json()
          setStats(prev => ({
            ...prev,
            auditLogs: auditData.total || 0
          }))
        } else {
          console.warn('[AdminDashboard] Failed to fetch audit logs count')
        }

        if (staffRes.ok) {
          const staff = await staffRes.json()
          setStats(prev => ({
            ...prev,
            totalStaff: staff.length || 0,
            activeStaff: staff.filter((s: any) => s.active && s.employmentStatus === 'active').length || 0
          }))
        }

        if (healthRes.ok) {
          const health = await healthRes.json()
          setStats(prev => ({
            ...prev,
            systemHealth: health
          }))
        }

        if (leavesRes.ok) {
          const leaves = await leavesRes.json()
          setStats(prev => ({
            ...prev,
            pendingLeaveRequests: leaves.leaves?.length || 0
          }))
        }
      } catch (error) {
        console.error('[AdminDashboard] Error fetching admin stats:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
        setError(errorMessage);
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Data</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-red-300 rounded text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'operational': return <Badge className="bg-green-100 text-green-800">Operational</Badge>
      case 'degraded': return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>
      case 'down': return <Badge className="bg-red-100 text-red-800">Down</Badge>
      default: return <Badge>Unknown</Badge>
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-purple-50 to-background">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">System administration, monitoring, and configuration</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health Status */}
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            System Health
          </CardTitle>
          <CardDescription>Real-time system status and monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Overall Status</p>
                <div className="mt-2">{getHealthBadge(stats.systemHealth.status)}</div>
              </div>
              {stats.systemHealth.status === 'operational' ? (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Database</p>
                <div className="mt-2">
                  {stats.systemHealth.database ? (
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Disconnected</Badge>
                  )}
                </div>
              </div>
              <Database className={`w-8 h-8 ${stats.systemHealth.database ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">API Service</p>
                <div className="mt-2">
                  {stats.systemHealth.api ? (
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Offline</Badge>
                  )}
                </div>
              </div>
              <Network className={`w-8 h-8 ${stats.systemHealth.api ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-lg font-semibold mt-2">{formatUptime(stats.systemHealth.uptime)}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          {stats.systemHealth.diskUsage !== undefined && (
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Disk Usage</span>
                <span className="text-sm font-semibold">{stats.systemHealth.diskUsage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    stats.systemHealth.diskUsage > 90 ? 'bg-red-500' :
                    stats.systemHealth.diskUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${stats.systemHealth.diskUsage}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{stats.totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeUsers} active</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staff Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.totalStaff}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeStaff} active</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-indigo-600">{stats.auditLogs.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Total log entries</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Pending Leaves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{stats.pendingLeaveRequests}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks and system operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-purple-50"
              onClick={() => window.location.href = '?tab=users'}
            >
              <Users className="w-6 h-6 text-purple-600" />
              <div className="text-left">
                <h3 className="font-semibold">User Management</h3>
                <p className="text-sm text-muted-foreground">Manage accounts and roles</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-purple-50"
              onClick={() => window.location.href = '?tab=audit-logs'}
            >
              <FileText className="w-6 h-6 text-blue-600" />
              <div className="text-left">
                <h3 className="font-semibold">Audit Logs</h3>
                <p className="text-sm text-muted-foreground">View system activity</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-purple-50"
              onClick={() => window.location.href = '?tab=settings'}
            >
              <Settings className="w-6 h-6 text-green-600" />
              <div className="text-left">
                <h3 className="font-semibold">System Settings</h3>
                <p className="text-sm text-muted-foreground">Configure parameters</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-purple-50"
              onClick={async () => {
                try {
                  const { apiRequest } = await import('@/lib/api-config')
                  const res = await apiRequest('/api/admin/system/backup', { method: 'POST' })
                  if (res.ok) {
                    alert('Backup initiated successfully')
                  } else {
                    alert('Failed to initiate backup')
                  }
                } catch (error) {
                  alert('Error initiating backup')
                }
              }}
            >
              <HardDrive className="w-6 h-6 text-orange-600" />
              <div className="text-left">
                <h3 className="font-semibold">Backup System</h3>
                <p className="text-sm text-muted-foreground">Create system backup</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

