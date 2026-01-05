/**
 * Leave Deferment Request Component
 * Employee-facing UI for requesting leave deferment before year-end
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { apiRequest } from '@/lib/api'

interface LeaveDefermentRequestProps {
  staffId?: string
  onSuccess?: () => void
}

export default function LeaveDefermentRequest({ staffId, onSuccess }: LeaveDefermentRequestProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [leaveBalance, setLeaveBalance] = useState<any>(null)
  const [formData, setFormData] = useState({
    leaveType: '',
    unusedDays: '',
    reason: '',
    reasonCode: '',
  })

  useEffect(() => {
    if (staffId) {
      fetchLeaveBalance()
    }
  }, [staffId])

  const fetchLeaveBalance = async () => {
    try {
      const response = await apiRequest(`/api/balances/${staffId}`)
      if (response.ok) {
        const balance = await response.json()
        setLeaveBalance(balance)
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await apiRequest('/api/leave-deferment', {
        method: 'POST',
        body: JSON.stringify({
          leaveType: formData.leaveType,
          unusedDays: parseFloat(formData.unusedDays),
          reason: formData.reason,
          reasonCode: formData.reasonCode || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Success',
          description: data.message || 'Deferment request submitted successfully',
        })
        setFormData({ leaveType: '', unusedDays: '', reason: '', reasonCode: '' })
        if (onSuccess) onSuccess()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit deferment request')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit deferment request',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getAvailableBalance = () => {
    if (!leaveBalance || !formData.leaveType) return 0
    const field = formData.leaveType.toLowerCase() === 'annual' ? 'annual' :
                 formData.leaveType.toLowerCase() === 'sick' ? 'sick' :
                 formData.leaveType.toLowerCase() === 'special service' ? 'specialService' :
                 formData.leaveType.toLowerCase() === 'training' ? 'training' :
                 formData.leaveType.toLowerCase() === 'study' ? 'study' : null
    return field ? (leaveBalance[field] || 0) : 0
  }

  const today = new Date()
  const currentYear = today.getFullYear()
  const yearEnd = new Date(currentYear, 11, 31)
  const daysUntilYearEnd = Math.ceil((yearEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Request Leave Deferment
        </CardTitle>
        <CardDescription>
          Request to defer unused leave before year-end (exceptional cases only)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {daysUntilYearEnd <= 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Year-end has passed. Deferment requests must be submitted before December 31.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Deferment requests are for exceptional cases only (e.g., national duty, emergency assignment, staff shortages). 
                You have {daysUntilYearEnd} days until year-end. Requests require supervisor, HR, and authorized officer approval.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select
                  value={formData.leaveType}
                  onValueChange={(value) => setFormData({ ...formData, leaveType: value, unusedDays: '' })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Sick">Sick</SelectItem>
                    <SelectItem value="Special Service">Special Service</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Study">Study</SelectItem>
                  </SelectContent>
                </Select>
                {formData.leaveType && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Available balance: {getAvailableBalance().toFixed(1)} days
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="unusedDays">Unused Days to Defer</Label>
                <Input
                  id="unusedDays"
                  type="number"
                  min="0.5"
                  step="0.5"
                  max={getAvailableBalance()}
                  value={formData.unusedDays}
                  onChange={(e) => setFormData({ ...formData, unusedDays: e.target.value })}
                  required
                />
                {formData.unusedDays && parseFloat(formData.unusedDays) > getAvailableBalance() && (
                  <p className="text-sm text-red-500 mt-1">
                    Cannot defer more than available balance ({getAvailableBalance().toFixed(1)} days)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="reasonCode">Reason Code</Label>
                <Select
                  value={formData.reasonCode}
                  onValueChange={(value) => setFormData({ ...formData, reasonCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason code (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATIONAL_DUTY">National Duty</SelectItem>
                    <SelectItem value="EMERGENCY_ASSIGNMENT">Emergency Assignment</SelectItem>
                    <SelectItem value="STAFF_SHORTAGE">Staff Shortage</SelectItem>
                    <SelectItem value="OTHER">Other (specify in reason)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Reason (Required)</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Explain why you need to defer leave (e.g., national duty, emergency assignment, staff shortages)"
                  required
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !formData.leaveType || !formData.unusedDays || !formData.reason || parseFloat(formData.unusedDays) > getAvailableBalance()}
                className="w-full"
              >
                {loading ? 'Submitting...' : 'Submit Deferment Request'}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  )
}

