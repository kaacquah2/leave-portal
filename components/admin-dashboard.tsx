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

  useEffect(() => {
    // Fetch admin dashboard stats
    const fetchStats = async () => {
      try {
        const [usersRes, auditRes] = await Promise.all([
          fetch('/api/admin/users', {
            credentials: 'include',
          }),
          fetch('/api/admin/audit-logs?limit=1', {
            credentials: 'include',
          })
        ])

        if (usersRes.ok) {
          const users = await usersRes.json()
          setStats(prev => ({
            ...prev,
            totalUsers: users.length || 0,
            activeUsers: users.filter((u: any) => u.active).length || 0
          }))
        }

        if (auditRes.ok) {
          const auditData = await auditRes.json()
          setStats(prev => ({
            ...prev,
            auditLogs: auditData.total || 0
          }))
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      }
    }

    fetchStats()
  }, [])

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

