'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import type { ReturnType } from '@/lib/data-store'
import type { LeavePolicy } from '@/lib/data-store'

interface LeavePolicyManagementProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
}

export default function LeavePolicyManagement({ store }: LeavePolicyManagementProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<LeavePolicy>>({
    leaveType: 'Annual',
    maxDays: 30,
    accrualRate: 2.5,
    carryoverAllowed: true,
    maxCarryover: 10,
    requiresApproval: true,
    approvalLevels: 1,
    active: true,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      if (editingId) {
        await store.updateLeavePolicy(editingId, formData)
      } else {
        await store.addLeavePolicy(formData as Omit<LeavePolicy, 'id' | 'createdAt'>)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({
        leaveType: 'Annual',
        maxDays: 30,
        accrualRate: 2.5,
        carryoverAllowed: true,
        maxCarryover: 10,
        requiresApproval: true,
        approvalLevels: 1,
        active: true,
      })
    } catch (error) {
      console.error('Error saving leave policy:', error)
      alert('Failed to save leave policy. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (policy: LeavePolicy) => {
    setEditingId(policy.id)
    setFormData(policy)
    setShowForm(true)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Policy Management</h1>
          <p className="text-muted-foreground mt-1">Configure leave policies and rules</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Policy
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Leave Policy' : 'Add New Leave Policy'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select
                  value={formData.leaveType}
                  onValueChange={(value) => setFormData({ ...formData, leaveType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Sick">Sick</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Special Service">Special Service</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Days</Label>
                <Input
                  type="number"
                  value={formData.maxDays}
                  onChange={(e) => setFormData({ ...formData, maxDays: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Accrual Rate (days per month)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.accrualRate}
                  onChange={(e) => setFormData({ ...formData, accrualRate: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Approval Levels</Label>
                <Select
                  value={formData.approvalLevels?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, approvalLevels: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 (Manager only)</SelectItem>
                    <SelectItem value="2">2 (Manager + HR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Carryover Days</Label>
                <Input
                  type="number"
                  value={formData.maxCarryover}
                  onChange={(e) => setFormData({ ...formData, maxCarryover: parseInt(e.target.value) })}
                  disabled={!formData.carryoverAllowed}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.carryoverAllowed}
                onCheckedChange={(checked) => setFormData({ ...formData, carryoverAllowed: checked })}
              />
              <Label>Allow Carryover</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.requiresApproval}
                onCheckedChange={(checked) => setFormData({ ...formData, requiresApproval: checked })}
              />
              <Label>Requires Approval</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label>Active</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-2 border-green-200">
        <CardHeader>
          <CardTitle>Leave Policies</CardTitle>
          <CardDescription>Manage leave policies and rules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {store.leavePolicies.map(policy => (
              <div key={policy.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{policy.leaveType}</h3>
                    <Badge variant={policy.active ? 'default' : 'secondary'}>
                      {policy.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(policy)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Max Days:</span>
                    <p className="font-medium">{policy.maxDays}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Accrual Rate:</span>
                    <p className="font-medium">{policy.accrualRate} days/month</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Carryover:</span>
                    <p className="font-medium">
                      {policy.carryoverAllowed ? `Yes (max ${policy.maxCarryover})` : 'No'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Approval Levels:</span>
                    <p className="font-medium">{policy.approvalLevels}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

