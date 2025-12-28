'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, Shield, Activity } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    auditLogs: 0,
    systemHealth: 'operational'
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
        
        const [usersRes, auditRes] = await Promise.all([
          apiRequest('/api/admin/users').catch((err) => {
            console.error('[AdminDashboard] Error fetching users:', err);
            return { ok: false, error: err } as any;
          }),
          apiRequest('/api/admin/audit-logs?limit=1').catch((err) => {
            console.error('[AdminDashboard] Error fetching audit logs:', err);
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
          const errorMsg = (usersRes as any).error?.message || 'Failed to fetch users';
          setError(errorMsg);
        }

        if (auditRes.ok) {
          const auditData = await auditRes.json()
          setStats(prev => ({
            ...prev,
            auditLogs: auditData.total || 0
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

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-purple-50 to-background">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">System administration and monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{stats.totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
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
            <p className="text-3xl font-bold text-blue-600">{stats.auditLogs}</p>
            <p className="text-xs text-muted-foreground mt-1">Total log entries</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 capitalize">{stats.systemHealth}</p>
            <p className="text-xs text-muted-foreground mt-1">All systems normal</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg hover:bg-purple-50 cursor-pointer">
              <h3 className="font-semibold">User Management</h3>
              <p className="text-sm text-muted-foreground">Manage user accounts and roles</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-purple-50 cursor-pointer">
              <h3 className="font-semibold">Audit Logs</h3>
              <p className="text-sm text-muted-foreground">View system activity logs</p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-purple-50 cursor-pointer">
              <h3 className="font-semibold">System Settings</h3>
              <p className="text-sm text-muted-foreground">Configure system parameters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

