'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TerminateStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffMember: {
    id: string
    staffId: string
    firstName: string
    lastName: string
  }
  onTerminate: (data: {
    terminationDate: string
    terminationReason: string
    employmentStatus: string
  }) => Promise<void>
}

export default function TerminateStaffDialog({
  open,
  onOpenChange,
  staffMember,
  onTerminate,
}: TerminateStaffDialogProps) {
  const [terminationDate, setTerminationDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [terminationReason, setTerminationReason] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('terminated')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!terminationDate) {
      setError('Termination date is required')
      return
    }

    if (!terminationReason.trim()) {
      setError('Termination reason is required')
      return
    }

    if (terminationReason.trim().length < 10) {
      setError('Termination reason must be at least 10 characters')
      return
    }

    setIsSubmitting(true)
    try {
      await onTerminate({
        terminationDate,
        terminationReason: terminationReason.trim(),
        employmentStatus,
      })
      onOpenChange(false)
      // Reset form
      setTerminationDate(new Date().toISOString().split('T')[0])
      setTerminationReason('')
      setEmploymentStatus('terminated')
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to terminate staff member'
      const errorData = err?.errorData || err?.response?.data || {}
      const troubleshooting = errorData?.troubleshooting || [
        'Verify you have HR role',
        'Check if staff member is already terminated',
        'Ensure all required fields are filled',
        'Verify termination reason is at least 10 characters',
        'Check browser console for errors',
        'Contact IT support',
      ]
      
      setError(`${errorMessage}\n\nTroubleshooting:\n${troubleshooting.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}`)
      
      // Log for debugging
      console.error('Termination error:', err)
      if (troubleshooting.length > 0) {
        console.log('Troubleshooting steps:', troubleshooting)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Terminate Staff Member
          </DialogTitle>
          <DialogDescription>
            This action will deactivate the staff member and their user account.
            This action cannot be easily undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-medium">
              Staff Member: {staffMember.firstName} {staffMember.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              Staff ID: {staffMember.staffId}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="employmentStatus">Employment Status</Label>
            <Select
              value={employmentStatus}
              onValueChange={setEmploymentStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="resigned">Resigned</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="terminationDate">Termination Date *</Label>
            <Input
              id="terminationDate"
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terminationReason">
              Termination Reason * (Minimum 10 characters)
            </Label>
            <Textarea
              id="terminationReason"
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="Enter detailed reason for termination..."
              required
              rows={4}
              minLength={10}
            />
            <p className="text-xs text-muted-foreground">
              {terminationReason.length}/10 characters minimum
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || !terminationDate || terminationReason.trim().length < 10}
            >
              {isSubmitting ? 'Terminating...' : 'Terminate Staff Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

