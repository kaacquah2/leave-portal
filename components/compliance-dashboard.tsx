'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Lock, 
  RefreshCw,
  TrendingUp,
  Users,
  Download,
  AlertCircle
} from 'lucide-react'
import { apiRequest } from '@/lib/api'
import { toast } from 'sonner'

interface ComplianceDashboardData {
  overallStatus: string
  generatedAt: string
  statutoryCompliance: {
    status: string
    totalPolicies: number
    compliant: number
    nonCompliant: number
    withWarnings: number
  }
  dataProtection: {
    privacyAcknowledgements: {
      total: number
      percentage: number
      recent30Days: number
      status: string
    }
  }
  pendingActions: {
    balanceOverrides: number
    policyVersions: number
    status: string
  }
  legalReferences: {
    labourAct651: string
    dataProtectionAct843: string
    pscConditions: string
    ohcsGuidelines: string
  }
}

export default function ComplianceDashboard() {
  const [data, setData] = useState<ComplianceDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiRequest('/api/reports/compliance/dashboard')
      
      if (!response.ok) {
        throw new Error('Failed to fetch compliance dashboard data')
      }

      const dashboardData = await response.json()
      setData(dashboardData)
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance dashboard')
      toast.error('Failed to load compliance dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Compliant</Badge>
      case 'REQUIRES_REVIEW':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Requires Review</Badge>
      case 'NON_COMPLIANT':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Non-Compliant</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'text-green-600'
      case 'REQUIRES_REVIEW':
        return 'text-yellow-600'
      case 'NON_COMPLIANT':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading compliance dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Failed to load compliance dashboard'}
            <Button onClick={fetchData} variant="outline" className="mt-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Compliance Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Government compliance status and monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => {
            // Export functionality
            toast.info('Export feature coming soon')
          }}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Compliance Status</span>
            {getStatusBadge(data.overallStatus)}
          </CardTitle>
          <CardDescription>
            Last updated: {new Date(data.generatedAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">Statutory Compliance</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(data.statutoryCompliance.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {data.statutoryCompliance.compliant} of {data.statutoryCompliance.totalPolicies} policies compliant
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-purple-600" />
                <span className="font-semibold">Data Protection</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(data.dataProtection.privacyAcknowledgements.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {data.dataProtection.privacyAcknowledgements.percentage}% acknowledged
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold">Pending Actions</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(data.pendingActions.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {data.pendingActions.balanceOverrides + data.pendingActions.policyVersions} pending items
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statutory Compliance Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Statutory Leave Compliance (Labour Act 651)
          </CardTitle>
          <CardDescription>
            Compliance with statutory minimum leave entitlements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {data.statutoryCompliance.compliant}
              </div>
              <div className="text-sm text-muted-foreground">Compliant Policies</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {data.statutoryCompliance.nonCompliant}
              </div>
              <div className="text-sm text-muted-foreground">Non-Compliant</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {data.statutoryCompliance.withWarnings}
              </div>
              <div className="text-sm text-muted-foreground">With Warnings</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {data.statutoryCompliance.totalPolicies}
              </div>
              <div className="text-sm text-muted-foreground">Total Policies</div>
            </div>
          </div>

          {data.statutoryCompliance.nonCompliant > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Action Required:</strong> {data.statutoryCompliance.nonCompliant} policy(s) are below statutory minimums.
                Please review and update these policies to ensure compliance with Labour Act 651.
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            <p><strong>Legal Reference:</strong> {data.legalReferences.labourAct651}</p>
          </div>
        </CardContent>
      </Card>

      {/* Data Protection Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Data Protection Act 843 Compliance
          </CardTitle>
          <CardDescription>
            Privacy notice acknowledgement and data access compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div>
                <div className="font-semibold">Privacy Notice Acknowledgement</div>
                <div className="text-sm text-muted-foreground">
                  {data.dataProtection.privacyAcknowledgements.total} users acknowledged
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getStatusColor(data.dataProtection.privacyAcknowledgements.status)}`}>
                  {data.dataProtection.privacyAcknowledgements.percentage}%
                </div>
                <div className="text-xs text-muted-foreground">Acknowledged</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Recent (30 days)</div>
                <div className="text-xl font-bold">
                  {data.dataProtection.privacyAcknowledgements.recent30Days}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Total Acknowledged</div>
                <div className="text-xl font-bold">
                  {data.dataProtection.privacyAcknowledgements.total}
                </div>
              </div>
            </div>

            {data.dataProtection.privacyAcknowledgements.percentage < 90 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Privacy acknowledgement rate is below 90%. Consider sending reminders to users who haven't acknowledged.
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              <p><strong>Legal Reference:</strong> {data.legalReferences.dataProtectionAct843}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Pending Actions Requiring Review
          </CardTitle>
          <CardDescription>
            Items that require administrative review or approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border-2 ${
              data.pendingActions.balanceOverrides > 0 
                ? 'border-yellow-300 bg-yellow-50' 
                : 'border-green-300 bg-green-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Balance Overrides</span>
                <Badge variant={data.pendingActions.balanceOverrides > 0 ? 'default' : 'secondary'}>
                  {data.pendingActions.balanceOverrides}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Leave balance override requests pending HR Director approval
              </p>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              data.pendingActions.policyVersions > 0 
                ? 'border-yellow-300 bg-yellow-50' 
                : 'border-green-300 bg-green-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Policy Versions</span>
                <Badge variant={data.pendingActions.policyVersions > 0 ? 'default' : 'secondary'}>
                  {data.pendingActions.policyVersions}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Policy changes pending HR Director approval
              </p>
            </div>
          </div>

          {data.pendingActions.balanceOverrides + data.pendingActions.policyVersions > 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                There are pending items requiring review. Please review and approve or reject these items.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Legal References */}
      <Card>
        <CardHeader>
          <CardTitle>Legal References</CardTitle>
          <CardDescription>
            Applicable laws and regulations for compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>{data.legalReferences.labourAct651}</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span>{data.legalReferences.dataProtectionAct843}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span>{data.legalReferences.pscConditions}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span>{data.legalReferences.ohcsGuidelines}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

