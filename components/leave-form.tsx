'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { useDataStore } from '@/lib/data-store'

interface LeaveFormProps {
  store: ReturnType<typeof useDataStore>
  onClose: () => void
  staffId?: string // Optional: for employee self-service
  templateId?: string // Optional: pre-fill from template
}

export default function LeaveForm({ store, onClose, staffId, templateId }: LeaveFormProps) {
  const currentStaff = staffId ? store.staff.find(s => s.staffId === staffId) : store.staff[0]
  const template = templateId ? store.leaveTemplates.find(t => t.id === templateId) : null
  
  const [formData, setFormData] = useState({
    staffId: staffId || currentStaff?.staffId || '',
    staffName: currentStaff ? `${currentStaff.firstName} ${currentStaff.lastName}` : '',
    leaveType: (template?.leaveType || 'Annual') as const,
    startDate: '',
    endDate: '',
    days: template?.defaultDays || 1,
    reason: template?.defaultReason || '',
    templateId: templateId,
  })
  
  useEffect(() => {
    if (template) {
      setFormData(prev => ({
        ...prev,
        leaveType: template.leaveType as any,
        days: template.defaultDays,
        reason: template.defaultReason,
        templateId: template.id,
      }))
    }
  }, [template])

  const leaveTypes = ['Annual', 'Sick', 'Unpaid', 'Special Service', 'Training'] as const

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return Math.max(1, diffDays)
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const staff = store.staff.find(s => s.staffId === formData.staffId)
    if (!staff) {
      alert('Staff member not found')
      return
    }
    
    setIsSubmitting(true)
    try {
      // Get leave policy to determine approval levels
      const policy = store.leavePolicies.find(p => p.leaveType === formData.leaveType && p.active)
      const approvalLevels = policy && policy.approvalLevels > 1
        ? Array.from({ length: policy.approvalLevels }, (_, i) => ({
            level: i + 1,
            approverRole: i === 0 ? 'manager' as const : 'hr' as const,
            status: 'pending' as const,
          }))
        : undefined
      
      await store.addLeaveRequest({
        staffId: formData.staffId,
        staffName: `${staff.firstName} ${staff.lastName}`,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: formData.days,
        reason: formData.reason,
        templateId: formData.templateId,
        approvalLevels,
      })
      onClose()
    } catch (error) {
      console.error('Error submitting leave request:', error)
      alert('Failed to submit leave request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startDate = formData.startDate
  const endDate = formData.endDate
  const days = calculateDays(startDate, endDate)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!staffId && (
        <div>
          <Label htmlFor="template">Use Template (Optional)</Label>
          <Select
            value={formData.templateId || 'none'}
            onValueChange={(value) => {
              if (value === 'none') {
                setFormData({
                  ...formData,
                  templateId: undefined,
                })
              } else {
                const selectedTemplate = store.leaveTemplates.find(t => t.id === value)
                if (selectedTemplate) {
                  setFormData({
                    ...formData,
                    leaveType: selectedTemplate.leaveType as any,
                    days: selectedTemplate.defaultDays,
                    reason: selectedTemplate.defaultReason,
                    templateId: selectedTemplate.id,
                  })
                }
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {store.leaveTemplates.filter(t => t.active).map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {!staffId && (
          <div>
            <Label htmlFor="staffId">Staff Member</Label>
            <Select
              value={formData.staffId}
              onValueChange={(value) => {
                const staff = store.staff.find(s => s.staffId === value)
                setFormData({
                  ...formData,
                  staffId: value,
                  staffName: staff ? `${staff.firstName} ${staff.lastName}` : ''
                })
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {store.staff.map(s => (
                  <SelectItem key={s.id} value={s.staffId}>
                    {s.staffId} - {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="leaveType">Leave Type</Label>
          <Select
            value={formData.leaveType}
            onValueChange={(value) => setFormData({...formData, leaveType: value as any})}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leaveTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="days">Days</Label>
          <Input
            id="days"
            type="number"
            value={days}
            onChange={(e) => setFormData({...formData, days: parseInt(e.target.value)})}
            disabled
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="reason">Reason</Label>
          <Input
            id="reason"
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            placeholder="Please provide reason for leave"
            required
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="bg-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
        </Button>
      </div>
    </form>
  )
}
