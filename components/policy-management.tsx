'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Shield,
  RefreshCw,
  Download
} from 'lucide-react'
import { apiRequest } from '@/lib/api'
import { toast } from 'sonner'
import { getStatutoryMinimum, hasStatutoryMinimum, validateLeavePolicyAgainstStatutoryMinimums } from '@/lib/statutory-leave-validation'
import { useAuth } from '@/hooks/use-auth'
import { hasPermission, type UserRole } from '@/lib/permissions'

interface LeavePolicy {
  id: string
  leaveType: string
  maxDays: number
  accrualRate: number
  accrualFrequency: string
  carryoverAllowed: boolean
  maxCarryover: number
  expiresAfterMonths: number | null
  requiresApproval: boolean
  approvalLevels: number
  active: boolean
  createdAt: string
  updatedAt: string
}

interface ComplianceReport {
  summary: {
    totalPolicies: number
    compliantPolicies: number
    nonCompliantPolicies: number
    policiesWithWarnings: number
  }
  policies: Array<{
    policyId: string
    leaveType: string
    currentMaxDays: number
    statutoryMinimum: number | null
    compliant: boolean
    errors: string[]
    warnings: string[]
    legalReference: string | null
  }>
}

export default function PolicyManagement() {
  const { user } = useAuth()
  const [policies, setPolicies] = useState<LeavePolicy[]>([])
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null)
  
  // Permission check for managing policies
  const canManagePolicies = user?.role ? hasPermission(user.role as UserRole, 'leave:policy:manage') : false
  const [formData, setFormData] = useState({
    leaveType: '',
    maxDays: '',
    accrualRate: '',
    accrualFrequency: 'monthly',
    carryoverAllowed: false,
    maxCarryover: '0',
    expiresAfterMonths: '',
    requiresApproval: true,
    approvalLevels: '1',
    active: true,
  })
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])

  const leaveTypes = [
    'Annual', 'Sick', 'Unpaid', 'Special Service', 
    'Training', 'Study', 'Maternity', 'Paternity', 'Compassionate'
  ]

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      setError(null)

      const [policiesRes, complianceRes] = await Promise.all([
        apiRequest('/api/leave-policies'),
        apiRequest('/api/reports/compliance/statutory').catch(() => null)
      ])

      if (!policiesRes.ok) {
        throw new Error('Failed to fetch policies')
      }

      const policiesData = await policiesRes.json()
      setPolicies(policiesData)

      if (complianceRes?.ok) {
        const complianceData = await complianceRes.json()
        setComplianceReport(complianceData)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load policies')
      toast.error('Failed to load policies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicies()
  }, [])

  useEffect(() => {
    // Real-time validation
    if (formData.leaveType && formData.maxDays) {
      const maxDaysNum = parseInt(formData.maxDays)
      if (!isNaN(maxDaysNum)) {
        const validation = validateLeavePolicyAgainstStatutoryMinimums(
          formData.leaveType,
          maxDaysNum
        )
        setValidationErrors(validation.errors)
        setValidationWarnings(validation.warnings)
      }
    } else {
      setValidationErrors([])
      setValidationWarnings([])
    }
  }, [formData.leaveType, formData.maxDays])

  const handleOpenDialog = (policy?: LeavePolicy) => {
    if (policy) {
      setEditingPolicy(policy)
      setFormData({
        leaveType: policy.leaveType,
        maxDays: policy.maxDays.toString(),
        accrualRate: policy.accrualRate.toString(),
        accrualFrequency: policy.accrualFrequency,
        carryoverAllowed: policy.carryoverAllowed,
        maxCarryover: policy.maxCarryover.toString(),
        expiresAfterMonths: policy.expiresAfterMonths?.toString() || '',
        requiresApproval: policy.requiresApproval,
        approvalLevels: policy.approvalLevels.toString(),
        active: policy.active,
      })
    } else {
      setEditingPolicy(null)
      setFormData({
        leaveType: '',
        maxDays: '',
        accrualRate: '',
        accrualFrequency: 'monthly',
        carryoverAllowed: false,
        maxCarryover: '0',
        expiresAfterMonths: '',
        requiresApproval: true,
        approvalLevels: '1',
        active: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingPolicy(null)
    setValidationErrors([])
    setValidationWarnings([])
  }

  const handleSubmit = async () => {
    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before submitting')
      return
    }

    try {
      const payload = {
        leaveType: formData.leaveType,
        maxDays: parseInt(formData.maxDays),
        accrualRate: parseFloat(formData.accrualRate),
        accrualFrequency: formData.accrualFrequency,
        carryoverAllowed: formData.carryoverAllowed,
        maxCarryover: parseInt(formData.maxCarryover),
        expiresAfterMonths: formData.expiresAfterMonths ? parseInt(formData.expiresAfterMonths) : null,
        requiresApproval: formData.requiresApproval,
        approvalLevels: parseInt(formData.approvalLevels),
        active: formData.active,
      }

      if (editingPolicy) {
        const response = await apiRequest(`/api/leave-policies/${editingPolicy.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update policy')
        }

        toast.success('Policy updated successfully')
      } else {
        const response = await apiRequest('/api/leave-policies', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json()
          if (errorData.errorCode === 'STATUTORY_MINIMUM_VIOLATION') {
            toast.error(`Statutory violation: ${errorData.error}`)
            setValidationErrors(errorData.details || [])
            return
          }
          throw new Error(errorData.error || 'Failed to create policy')
        }

        toast.success('Policy created successfully')
      }

      handleCloseDialog()
      fetchPolicies()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save policy')
    }
  }

  const handleDelete = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) {
      return
    }

    try {
      const response = await apiRequest(`/api/leave-policies/${policyId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete policy')
      }

      toast.success('Policy deleted successfully')
      fetchPolicies()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete policy')
    }
  }

  const getPolicyCompliance = (policy: LeavePolicy) => {
    if (!complianceReport) return null
    return complianceReport.policies.find(p => p.policyId === policy.id)
  }

  const getStatutoryMinimumForType = (leaveType: string) => {
    return getStatutoryMinimum(leaveType)
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading policies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Leave Policy Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage leave policies with statutory compliance validation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPolicies} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Compliance Summary */}
      {complianceReport && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Statutory Compliance Summary
            </CardTitle>
            <CardDescription>
              Labour Act 651 Compliance Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {complianceReport.summary.compliantPolicies}
                </div>
                <div className="text-sm text-muted-foreground">Compliant</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">
                  {complianceReport.summary.nonCompliantPolicies}
                </div>
                <div className="text-sm text-muted-foreground">Non-Compliant</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">
                  {complianceReport.summary.policiesWithWarnings}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {complianceReport.summary.totalPolicies}
                </div>
                <div className="text-sm text-muted-foreground">Total Policies</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policies List */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Policies</CardTitle>
          <CardDescription>
            All leave policies with compliance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : policies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No policies found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {policies.map((policy) => {
                const compliance = getPolicyCompliance(policy)
                const statutoryMin = getStatutoryMinimumForType(policy.leaveType)

                return (
                  <div
                    key={policy.id}
                    className={`p-4 border rounded-lg ${
                      compliance && !compliance.compliant
                        ? 'border-red-300 bg-red-50'
                        : compliance && compliance.warnings.length > 0
                        ? 'border-yellow-300 bg-yellow-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{policy.leaveType}</h3>
                          {!policy.active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {compliance && (
                            <>
                              {compliance.compliant ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Compliant
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Non-Compliant
                                </Badge>
                              )}
                              {compliance.warnings.length > 0 && (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Warnings
                                </Badge>
                              )}
                            </>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Max Days:</span>
                            <div className="font-semibold">
                              {policy.maxDays} days
                              {statutoryMin && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  (Min: {statutoryMin})
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Accrual Rate:</span>
                            <div className="font-semibold">
                              {policy.accrualRate} days/{policy.accrualFrequency}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Carryover:</span>
                            <div className="font-semibold">
                              {policy.carryoverAllowed ? `Yes (${policy.maxCarryover} max)` : 'No'}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Approval Levels:</span>
                            <div className="font-semibold">{policy.approvalLevels}</div>
                          </div>
                        </div>

                        {compliance && (
                          <div className="mt-3 space-y-1">
                            {compliance.errors.map((error, idx) => (
                              <Alert key={idx} variant="destructive" className="py-2">
                                <AlertDescription className="text-sm">{error}</AlertDescription>
                              </Alert>
                            ))}
                            {compliance.warnings.map((warning, idx) => (
                              <Alert key={idx} className="py-2 bg-yellow-50 border-yellow-200">
                                <AlertDescription className="text-sm">{warning}</AlertDescription>
                              </Alert>
                            ))}
                            {compliance.legalReference && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <strong>Legal Reference:</strong> {compliance.legalReference}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {canManagePolicies && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(policy)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(policy.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? 'Edit Leave Policy' : 'Create New Leave Policy'}
            </DialogTitle>
            <DialogDescription>
              Configure leave policy. Statutory minimums are enforced automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select
                value={formData.leaveType}
                onValueChange={(value) => {
                  setFormData({ ...formData, leaveType: value })
                  const min = getStatutoryMinimumForType(value)
                  if (min && (!formData.maxDays || parseInt(formData.maxDays) < min)) {
                    setFormData({ ...formData, leaveType: value, maxDays: min.toString() })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                      {hasStatutoryMinimum(type) && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Min: {getStatutoryMinimumForType(type)} days)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="maxDays">
                Maximum Days * 
                {formData.leaveType && getStatutoryMinimumForType(formData.leaveType) && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Statutory minimum: {getStatutoryMinimumForType(formData.leaveType)} days)
                  </span>
                )}
              </Label>
              <Input
                id="maxDays"
                type="number"
                value={formData.maxDays}
                onChange={(e) => setFormData({ ...formData, maxDays: e.target.value })}
                min={getStatutoryMinimumForType(formData.leaveType) || 0}
                required
              />
              {validationErrors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {validationErrors.map((error, idx) => (
                    <Alert key={idx} variant="destructive" className="py-2">
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
              {validationWarnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {validationWarnings.map((warning, idx) => (
                    <Alert key={idx} className="py-2 bg-yellow-50 border-yellow-200">
                      <AlertDescription className="text-sm">{warning}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accrualRate">Accrual Rate (days/month) *</Label>
                <Input
                  id="accrualRate"
                  type="number"
                  step="0.1"
                  value={formData.accrualRate}
                  onChange={(e) => setFormData({ ...formData, accrualRate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="accrualFrequency">Accrual Frequency</Label>
                <Select
                  value={formData.accrualFrequency}
                  onValueChange={(value) => setFormData({ ...formData, accrualFrequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="carryoverAllowed"
                checked={formData.carryoverAllowed}
                onCheckedChange={(checked) => setFormData({ ...formData, carryoverAllowed: checked })}
              />
              <Label htmlFor="carryoverAllowed">Allow Carryover</Label>
            </div>

            {formData.carryoverAllowed && (
              <div>
                <Label htmlFor="maxCarryover">Maximum Carryover Days</Label>
                <Input
                  id="maxCarryover"
                  type="number"
                  value={formData.maxCarryover}
                  onChange={(e) => setFormData({ ...formData, maxCarryover: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label htmlFor="expiresAfterMonths">Expires After (months, optional)</Label>
              <Input
                id="expiresAfterMonths"
                type="number"
                value={formData.expiresAfterMonths}
                onChange={(e) => setFormData({ ...formData, expiresAfterMonths: e.target.value })}
                placeholder="Leave empty for no expiration"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="requiresApproval"
                checked={formData.requiresApproval}
                onCheckedChange={(checked) => setFormData({ ...formData, requiresApproval: checked })}
              />
              <Label htmlFor="requiresApproval">Requires Approval</Label>
            </div>

            {formData.requiresApproval && (
              <div>
                <Label htmlFor="approvalLevels">Approval Levels</Label>
                <Input
                  id="approvalLevels"
                  type="number"
                  value={formData.approvalLevels}
                  onChange={(e) => setFormData({ ...formData, approvalLevels: e.target.value })}
                  min="1"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={validationErrors.length > 0}>
              {editingPolicy ? 'Update' : 'Create'} Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

