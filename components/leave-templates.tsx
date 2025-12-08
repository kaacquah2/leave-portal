'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit2, Trash2, FileText } from 'lucide-react'
import type { ReturnType } from '@/lib/data-store'
import type { LeaveRequestTemplate } from '@/lib/data-store'

interface LeaveTemplatesProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
}

export default function LeaveTemplates({ store }: LeaveTemplatesProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<LeaveRequestTemplate>>({
    name: '',
    leaveType: 'Annual',
    defaultDays: 1,
    defaultReason: '',
    active: true,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      if (editingId) {
        await store.updateLeaveTemplate(editingId, formData)
      } else {
        await store.addLeaveTemplate(formData as Omit<LeaveRequestTemplate, 'id' | 'createdAt'>)
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({
        name: '',
        leaveType: 'Annual',
        defaultDays: 1,
        defaultReason: '',
        active: true,
      })
    } catch (error) {
      console.error('Error saving leave template:', error)
      alert('Failed to save leave template. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (template: LeaveRequestTemplate) => {
    setEditingId(template.id)
    setFormData(template)
    setShowForm(true)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Request Templates</h1>
          <p className="text-muted-foreground mt-1">Create templates for common leave requests</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Template
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Template' : 'Add New Template'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Annual Leave - Family Vacation"
                />
              </div>
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
                <Label>Default Days</Label>
                <Input
                  type="number"
                  value={formData.defaultDays}
                  onChange={(e) => setFormData({ ...formData, defaultDays: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department (Optional)</Label>
                <Input
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value || undefined })}
                  placeholder="Leave empty for all departments"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Reason</Label>
              <Textarea
                value={formData.defaultReason}
                onChange={(e) => setFormData({ ...formData, defaultReason: e.target.value })}
                placeholder="Default reason for this leave type"
                rows={3}
              />
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
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Available Templates
          </CardTitle>
          <CardDescription>Pre-configured leave request templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {store.leaveTemplates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No templates available</p>
            ) : (
              store.leaveTemplates.map(template => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{template.name}</h3>
                      <Badge variant="outline">{template.leaveType}</Badge>
                      {template.department && (
                        <Badge variant="secondary">{template.department}</Badge>
                      )}
                      <Badge variant={template.active ? 'default' : 'secondary'}>
                        {template.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Default Days: <span className="font-medium">{template.defaultDays}</span></div>
                    <div>Default Reason: <span className="font-medium">{template.defaultReason || 'None'}</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

