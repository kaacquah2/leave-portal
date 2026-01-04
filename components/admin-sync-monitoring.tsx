'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Activity, AlertCircle, CheckCircle2, XCircle, RefreshCw, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SyncStatus {
  stats: {
    totalSyncs: number
    failedSyncs: number
    offlineActivities: number
    conflicts: number
    lastSync: string | null
    lastFailure: string | null
  }
  recentSyncs: any[]
  failedSyncs: any[]
  offlineActivity: any[]
  conflicts: any[]
}

export default function AdminSyncMonitoring() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const { apiRequest } = await import('@/lib/api-config')
      const res = await apiRequest('/api/admin/sync/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      } else {
        setError('Failed to fetch sync status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sync status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading && !status) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading sync status...</p>
        </div>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div className="p-8 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={fetchStatus} variant="outline">Retry</Button>
        </div>
      </div>
    )
  }

  if (!status) return null

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sync Monitoring</h1>
          <p className="text-muted-foreground mt-1">Monitor offline sync status and conflicts</p>
        </div>
        <Button onClick={fetchStatus} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Total Syncs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{status.stats.totalSyncs}</p>
            <p className="text-xs text-muted-foreground mt-1">Successful syncs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Failed Syncs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{status.stats.failedSyncs}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Offline Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{status.stats.offlineActivities}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{status.stats.conflicts}</p>
            <p className="text-xs text-muted-foreground mt-1">Requires resolution</p>
          </CardContent>
        </Card>
      </div>

      {/* Last Sync Info */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
          <CardDescription>Recent sync activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Last Successful Sync</p>
              <p className="text-lg font-semibold flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4" />
                {formatDate(status.stats.lastSync)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Failure</p>
              <p className="text-lg font-semibold flex items-center gap-2 mt-1">
                {status.stats.lastFailure ? (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    {formatDate(status.stats.lastFailure)}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    No recent failures
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failed Syncs */}
      {status.failedSyncs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Failed Sync Attempts
            </CardTitle>
            <CardDescription>Recent sync failures requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.failedSyncs.slice(0, 10).map((failure) => (
                <div key={failure.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{failure.user || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{failure.details}</p>
                    </div>
                    <Badge variant="destructive">{formatDate(failure.timestamp)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflicts */}
      {status.conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Sync Conflicts
            </CardTitle>
            <CardDescription>Data conflicts requiring resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.conflicts.slice(0, 10).map((conflict) => (
                <div key={conflict.id} className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{conflict.user || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{conflict.details}</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">
                      {formatDate(conflict.timestamp)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Syncs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Activity</CardTitle>
          <CardDescription>Latest sync operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {status.recentSyncs.length > 0 ? (
              status.recentSyncs.map((sync) => (
                <div key={sync.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{sync.action}</p>
                      <p className="text-sm text-muted-foreground">{sync.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">User: {sync.user}</p>
                    </div>
                    <Badge variant={sync.action === 'SYNC_FAILED' ? 'destructive' : 'default'}>
                      {formatDate(sync.timestamp)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent sync activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

