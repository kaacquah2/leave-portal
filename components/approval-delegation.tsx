'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Loader2 } from 'lucide-react'

interface ApprovalDelegationProps {
  leaveRequestId: string
  level: number
  approverRole: string
  onDelegated?: () => void
}

export default function ApprovalDelegation({
  leaveRequestId,
  level,
  approverRole,
  onDelegated,
}: ApprovalDelegationProps) {
  const [open, setOpen] = useState(false)
  const [delegates, setDelegates] = useState<Array<{ id: string; name: string; staffId: string }>>([])
  const [selectedDelegate, setSelectedDelegate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingDelegates, setFetchingDelegates] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchDelegates()
    }
  }, [open, approverRole])

  const fetchDelegates = async () => {
    try {
      setFetchingDelegates(true)
      // Fetch users with the same role or HR/Admin who can approve
      const roles = approverRole === 'manager' ? ['manager', 'hr', 'admin'] : ['hr', 'admin']
      
      const response = await fetch('/api/staff', { credentials: 'include' })
      if (response.ok) {
        const staff = await response.json()
        // Filter staff by role (simplified - in production, check user role)
        const availableDelegates = staff
          .filter((s: any) => s.active)
          .map((s: any) => ({
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
            staffId: s.staffId,
          }))
          .slice(0, 20) // Limit to first 20 for performance

        setDelegates(availableDelegates)
      }
    } catch (error) {
      console.error('Error fetching delegates:', error)
    } finally {
      setFetchingDelegates(false)
    }
  }

  const handleDelegate = async () => {
    if (!selectedDelegate) {
      toast({
        title: 'Error',
        description: 'Please select a delegate',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const delegate = delegates.find((d) => d.id === selectedDelegate)
      if (!delegate) {
        throw new Error('Delegate not found')
      }

      // Find delegate user ID
      const userResponse = await fetch(`/api/staff/${delegate.staffId}`, { credentials: 'include' })
      if (!userResponse.ok) {
        throw new Error('Failed to fetch delegate user')
      }

      const staffData = await userResponse.json()
      const delegateUserId = staffData.userId || delegate.id

      const response = await fetch('/api/approvals/delegate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leaveRequestId,
          level,
          delegateToStaffId: delegate.staffId,
          delegateToUserId: delegateUserId,
          reason,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delegate approval')
      }

      toast({
        title: 'Delegation Successful',
        description: `Approval has been delegated to ${delegate.name}`,
      })

      setOpen(false)
      setSelectedDelegate('')
      setReason('')
      onDelegated?.()
    } catch (error: any) {
      console.error('Error delegating approval:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delegate approval',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Delegate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delegate Approval</DialogTitle>
          <DialogDescription>
            Delegate this approval to another approver. They will receive a notification to approve on your behalf.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="delegate">Select Delegate</Label>
            {fetchingDelegates ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading delegates...</span>
              </div>
            ) : (
              <Select value={selectedDelegate} onValueChange={setSelectedDelegate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a delegate" />
                </SelectTrigger>
                <SelectContent>
                  {delegates.map((delegate) => (
                    <SelectItem key={delegate.id} value={delegate.id}>
                      {delegate.name} ({delegate.staffId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Explain why you're delegating this approval..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleDelegate} disabled={loading || !selectedDelegate}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Delegating...
              </>
            ) : (
              'Delegate Approval'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

