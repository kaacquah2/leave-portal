/**
 * Audit Coverage Dashboard
 * 
 * Displays comprehensive audit coverage report and gap analysis
 * Only accessible to AUDITOR, HR_DIRECTOR, and SYSTEM_ADMIN
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AuditCoverageReport {
  auditLogs: Array<{ action: string; _count: { id: number } }>
  dataAccessLogs: Array<{ action: string; dataType: string; _count: { id: number } }>
  exportLogs: Array<{ exportType: string; _count: { id: number } }>
  period: { startDate: string; endDate: string }
}

interface AuditGaps {
  period: { startDate: string; endDate: string }
  auditLogSummary: {
    totalLogs: number
    uniqueActions: number
    actionCounts: Record<string, number>
  }
  dataAccessSummary: {
    totalLogs: number
    uniqueDataTypes: number
    dataTypeCounts: Record<string, number>
  }
  gaps: {
    missingAuditActions: string[]
    missingDataTypes: string[]
  }
  recommendations: string[]
}

export default function AuditCoverageDashboard() {
  const [report, setReport] = useState<AuditCoverageReport | null>(null)
  const [gaps, setGaps] = useState<AuditGaps | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const fetchCoverage = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })

      const [reportRes, gapsRes] = await Promise.all([
        fetch(`/api/audit/coverage?${params}`),
        fetch(`/api/audit/gaps?${params}`),
      ])

      if (!reportRes.ok || !gapsRes.ok) {
        throw new Error('Failed to fetch audit coverage data')
      }

      const reportData = await reportRes.json()
      const gapsData = await gapsRes.json()

      setReport(reportData.report)
      setGaps(gapsData.gaps)
    } catch (err: any) {
      setError(err.message || 'Failed to load audit coverage')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoverage()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading audit coverage...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Audit Coverage Dashboard</h1>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="border rounded px-3 py-2"
          />
          <Button onClick={fetchCoverage}>Refresh</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>Total audit log entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {gaps?.auditLogSummary.totalLogs || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {gaps?.auditLogSummary.uniqueActions || 0} unique actions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Access Logs</CardTitle>
            <CardDescription>Data access tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {gaps?.dataAccessSummary.totalLogs || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {gaps?.dataAccessSummary.uniqueDataTypes || 0} data types
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Logs</CardTitle>
            <CardDescription>Data export tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {report?.exportLogs.reduce((sum, log) => sum + log._count.id, 0) || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {report?.exportLogs.length || 0} export types
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gap Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Gap Analysis</CardTitle>
          <CardDescription>Detected audit logging gaps</CardDescription>
        </CardHeader>
        <CardContent>
          {gaps?.gaps.missingAuditActions.length === 0 &&
          gaps?.gaps.missingDataTypes.length === 0 ? (
            <Alert>
              <AlertDescription>
                ✅ No gaps detected. All expected audit operations are being logged.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {gaps?.gaps.missingAuditActions && gaps.gaps.missingAuditActions.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <strong>Missing Audit Actions:</strong>{' '}
                    {gaps.gaps.missingAuditActions.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {gaps?.gaps.missingDataTypes && gaps.gaps.missingDataTypes.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <strong>Missing Data Types:</strong>{' '}
                    {gaps.gaps.missingDataTypes.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {gaps?.recommendations && gaps.recommendations.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Recommendations:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {gaps.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Action Breakdown</CardTitle>
          <CardDescription>Actions logged in the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {gaps?.auditLogSummary.actionCounts &&
            Object.entries(gaps.auditLogSummary.actionCounts).length > 0 ? (
              Object.entries(gaps.auditLogSummary.actionCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([action, count]) => (
                  <div key={action} className="flex justify-between items-center">
                    <span className="text-sm">{action}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))
            ) : (
              <div className="text-sm text-muted-foreground">No audit actions found</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Data Access Breakdown</CardTitle>
          <CardDescription>Data types accessed in the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {gaps?.dataAccessSummary.dataTypeCounts &&
            Object.entries(gaps.dataAccessSummary.dataTypeCounts).length > 0 ? (
              Object.entries(gaps.dataAccessSummary.dataTypeCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([dataType, count]) => (
                  <div key={dataType} className="flex justify-between items-center">
                    <span className="text-sm">{dataType}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))
            ) : (
              <div className="text-sm text-muted-foreground">No data access logs found</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

