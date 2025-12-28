'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, Upload, File, AlertCircle, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
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
  
  const [formData, setFormData] = useState<{
    staffId: string
    staffName: string
    leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Special Service' | 'Training' | 'Study' | 'Maternity' | 'Paternity' | 'Compassionate'
    startDate: string
    endDate: string
    days: number
    reason: string
    templateId?: string
  }>({
    staffId: staffId || currentStaff?.staffId || '',
    staffName: currentStaff ? `${currentStaff.firstName} ${currentStaff.lastName}` : '',
    leaveType: (template?.leaveType || 'Annual') as 'Annual' | 'Sick' | 'Unpaid' | 'Special Service' | 'Training' | 'Study' | 'Maternity' | 'Paternity' | 'Compassionate',
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

  const leaveTypes = ['Annual', 'Sick', 'Unpaid', 'Special Service', 'Training', 'Study', 'Maternity', 'Paternity', 'Compassionate'] as const

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return Math.max(1, diffDays)
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ file: File; type: string; description: string }>>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [currentBalance, setCurrentBalance] = useState<number | null>(null)
  const [holidaysInRange, setHolidaysInRange] = useState<number>(0)
  const [calculatedDays, setCalculatedDays] = useState(1)
  const { toast } = useToast()
  
  // Fetch leave balance when staff or leave type changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (formData.staffId && formData.leaveType && formData.leaveType !== 'Unpaid') {
        try {
          const balance = store.balances.find(b => b.staffId === formData.staffId)
          if (balance) {
            const balanceField = formData.leaveType.toLowerCase() as keyof typeof balance
            setCurrentBalance((balance[balanceField] as number) || 0)
          } else {
            setCurrentBalance(0)
          }
        } catch (error) {
          console.error('Error fetching balance:', error)
          setCurrentBalance(null)
        }
      } else {
        setCurrentBalance(null)
      }
    }
    
    fetchBalance()
  }, [formData.staffId, formData.leaveType, store.balances])
  
  // Calculate days with holiday exclusion when dates change
  useEffect(() => {
    const calculateDaysWithHolidays = async () => {
      if (formData.startDate && formData.endDate) {
        try {
          const response = await fetch(
            `/api/leaves/calculate-days?startDate=${formData.startDate}&endDate=${formData.endDate}`,
            { credentials: 'include' }
          )
          if (response.ok) {
            const data = await response.json()
            setCalculatedDays(data.workingDays)
            setHolidaysInRange(data.holidays)
            setFormData(prev => ({ ...prev, days: data.workingDays }))
          } else {
            // Fallback to simple calculation
            const days = calculateDays(formData.startDate, formData.endDate)
            setCalculatedDays(days)
            setHolidaysInRange(0)
            setFormData(prev => ({ ...prev, days }))
          }
        } catch (error) {
          // Fallback to simple calculation
          const days = calculateDays(formData.startDate, formData.endDate)
          setCalculatedDays(days)
          setHolidaysInRange(0)
          setFormData(prev => ({ ...prev, days }))
        }
      }
    }
    
    calculateDaysWithHolidays()
  }, [formData.startDate, formData.endDate])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'File size must be less than 10MB',
          variant: 'destructive',
        })
        return
      }
      setAttachments([...attachments, { file, type: 'other', description: '' }])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const updateAttachment = (index: number, field: 'type' | 'description', value: string) => {
    const updated = [...attachments]
    updated[index] = { ...updated[index], [field]: value }
    setAttachments(updated)
  }

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
      
      // Create leave request first
      const leaveRequest = await store.addLeaveRequest({
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

      // Upload attachments if any
      if (attachments.length > 0 && leaveRequest?.id) {
        for (const attachment of attachments) {
          try {
            const formData = new FormData()
            formData.append('file', attachment.file)
            formData.append('name', attachment.file.name)
            formData.append('attachmentType', attachment.type)
            formData.append('description', attachment.description)

            const response = await fetch(`/api/leaves/${leaveRequest.id}/attachments`, {
              method: 'POST',
              credentials: 'include',
              body: formData,
            })

            if (!response.ok) {
              console.error('Failed to upload attachment:', attachment.file.name)
            }
          } catch (error) {
            console.error('Error uploading attachment:', error)
          }
        }
      }

      onClose()
      // Show success message
      toast({
        title: 'Success',
        description: 'Leave request submitted successfully! Check the "Leave History" tab to view your request.',
      })
    } catch (error: any) {
      console.error('Error submitting leave request:', error)
      const errorMessage = error?.message || 'Failed to submit leave request'
      const troubleshooting = error?.troubleshooting || [
        'Refresh the page and try again',
        'Check the "Leave History" tab to see if the request was saved',
        'Verify you are looking at the correct date range',
        'Contact HR if the issue persists',
      ]
      
      alert(`${errorMessage}\n\nTroubleshooting:\n${troubleshooting.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}`)
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
            value={calculatedDays}
            onChange={(e) => {
              const newDays = parseInt(e.target.value) || 1
              setCalculatedDays(newDays)
              setFormData({...formData, days: newDays})
            }}
            min={1}
          />
          {holidaysInRange > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {holidaysInRange} holiday(s) excluded from calculation
            </p>
          )}
        </div>
        {formData.leaveType !== 'Unpaid' && currentBalance !== null && (
          <div className="col-span-2">
            <Alert className={calculatedDays > currentBalance ? 'border-red-500' : 'border-green-500'}>
              <div className="flex items-center gap-2">
                {calculatedDays > currentBalance ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <AlertDescription>
                  <strong>Available Balance:</strong> {currentBalance} days | 
                  <strong> Requested:</strong> {calculatedDays} days
                  {calculatedDays > currentBalance && (
                    <span className="text-red-600 font-semibold ml-2">
                      (Insufficient balance - {calculatedDays - currentBalance} days short)
                    </span>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          </div>
        )}
        <div className="col-span-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            placeholder="Please provide reason for leave"
            required
            rows={3}
          />
        </div>
      </div>

      {/* Government HR: Attachments Section */}
      <div className="space-y-4 border-t pt-4">
        <div>
          <Label>Attachments (Optional)</Label>
          <p className="text-sm text-muted-foreground mb-2">
            Upload supporting documents: Medical reports, Training letters, Official memos
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      toast({
                        title: 'Error',
                        description: 'File size must be less than 10MB',
                        variant: 'destructive',
                      })
                      return
                    }
                    setAttachments([...attachments, { file, type: 'other', description: '' }])
                  }
                }
                input.click()
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Add File
            </Button>
          </div>
        </div>

        {/* Attachment List */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                <File className="w-5 h-5 text-muted-foreground mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{attachment.file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={attachment.type}
                        onValueChange={(value) => updateAttachment(index, 'type', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medical">Medical Report</SelectItem>
                          <SelectItem value="training">Training Letter</SelectItem>
                          <SelectItem value="memo">Official Memo</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Description (Optional)</Label>
                      <Input
                        value={attachment.description}
                        onChange={(e) => updateAttachment(index, 'description', e.target.value)}
                        placeholder="Brief description"
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
