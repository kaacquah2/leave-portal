'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { RefreshCw, Database, Server, HardDrive, Cpu, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { apiRequest } from '@/lib/api-config'
import { toast } from 'sonner'

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down'
  api: 'healthy' | 'degraded' | 'down'
  diskSpace: number
  memoryUsage: number
  timestamp: string
}

interface BusinessAlert {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: Record<string, any>
  timestamp: string
}

export default function SystemHealth() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [alerts, setAlerts] = useState<BusinessAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const response = await apiRequest('/api/monitoring/health')

      if (!response.ok) {
        throw new Error('Failed to fetch system health')
      }

      const data = await response.json()
      setHealth(data.health)
      setAlerts(data.alerts || [])
    } catch (err: any) {
      toast.error('Failed to load system health')
      console.error('Health check error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchHealth, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'down':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'down':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
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
      second: '2-digit',
    })
  }

  if (loading && !health) {
    return (
      <div className="p-8">
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading system health...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground mt-1">Monitor system status and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? 'Disable' : 'Enable'} Auto-Refresh
          </Button>
          <Button variant="outline" onClick={fetchHealth} className="gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="w-4 h-4" />
                Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(health.database)}>
                  {health.database.toUpperCase()}
                </Badge>
                {getStatusIcon(health.database)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Server className="w-4 h-4" />
                API Server
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(health.api)}>
                  {health.api.toUpperCase()}
                </Badge>
                {getStatusIcon(health.api)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{health.memoryUsage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      health.memoryUsage > 80
                        ? 'bg-red-500'
                        : health.memoryUsage > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(health.memoryUsage, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Disk Space
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{health.diskSpace.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      health.diskSpace > 80
                        ? 'bg-red-500'
                        : health.diskSpace > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(health.diskSpace, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {health && (
        <Card>
          <CardHeader>
            <CardTitle>Last Updated</CardTitle>
            <CardDescription>{formatDate(health.timestamp)}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>{alerts.length} alert{alerts.length !== 1 ? 's' : ''} detected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alerts.map((alert, index) => (
              <Alert
                key={index}
                className={getSeverityColor(alert.severity)}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.type.replace(/_/g, ' ').toUpperCase()}</span>
                  <Badge className={getSeverityColor(alert.severity)}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                </AlertTitle>
                <AlertDescription>
                  <p className="mt-2">{alert.message}</p>
                  {Object.keys(alert.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">View Details</summary>
                      <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-auto">
                        {JSON.stringify(alert.details, null, 2)}
                      </pre>
                    </details>
                  )}
                  <p className="text-xs mt-2 opacity-75">
                    {formatDate(alert.timestamp)}
                  </p>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {alerts.length === 0 && health && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <p className="text-lg font-medium">All systems operational</p>
            <p className="text-sm text-muted-foreground">No alerts detected</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

