'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Plus, X, Calendar, UserCheck, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface Delegation {
  id: string
  delegatorId: string
  delegateeId: string
  startDate: string
  endDate: string
  leaveTypes: string[]
  status: string
  notes?: string
  revokedAt?: string
  revokedBy?: string
  delegator?: {
    staffId: string
    firstName: string
    lastName: string
    email: string
  }
  delegatee?: {
    staffId: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function DelegationManagement() {
  const { toast } = useToast()
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showRevokeDialog, setShowRevokeDialog] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    delegateeId: '',
    startDate: '',
    endDate: '',
    leaveTypes: [] as string[],
    notes: '',
  })
  const [staffList, setStaffList] = useState<Array<{ staffId: string; firstName: string; lastName: string }>>([])

  const leaveTypes = ['Annual', 'Sick', 'Unpaid', 'Special Service', 'Training', 'Study', 'Maternity', 'Paternity', 'Compassionate']

  useEffect(() => {
    fetchDelegations()
    fetchStaffList()
  }, [])

  const fetchDelegations = async () => {
    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/delegations')
      if (response.ok) {
        const data = await response.json()
        setDelegations(data)
      } else {
        throw new Error('Failed to fetch delegations')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load delegations',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStaffList = async () => {
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/staff')
      if (response.ok) {
        const data = await response.json()
        setStaffList(data.filter((s: any) => s.active))
      }
    } catch (error) {
      console.error('Error fetching staff list:', error)
    }
  }

  const handleCreate = async () => {
    if (!formData.delegateeId || !formData.startDate || !formData.endDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/delegations', {
        method: 'POST',
        body: JSON.stringify({
          delegateeId: formData.delegateeId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          leaveTypes: formData.leaveTypes,
          notes: formData.notes,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Delegation created successfully',
        })
        setShowCreateDialog(false)
        setFormData({
          delegateeId: '',
          startDate: '',
          endDate: '',
          leaveTypes: [],
          notes: '',
        })
        fetchDelegations()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create delegation')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create delegation',
        variant: 'destructive',
      })
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest(`/api/delegations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'revoke' }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Delegation revoked successfully',
        })
        setShowRevokeDialog(null)
        fetchDelegations()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to revoke delegation')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke delegation',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string, endDate: string) => {
    const now = new Date()
    const end = new Date(endDate)

    if (status === 'revoked') {
      return <Badge variant="destructive">Revoked</Badge>
    }
    if (status === 'expired' || now > end) {
      return <Badge variant="secondary">Expired</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const toggleLeaveType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      leaveTypes: prev.leaveTypes.includes(type)
        ? prev.leaveTypes.filter(t => t !== type)
        : [...prev.leaveTypes, type],
    }))
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approval Delegation</h1>
          <p className="text-muted-foreground mt-1">Manage acting manager and delegation assignments</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Delegation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Delegations</CardTitle>
          <CardDescription>Time-bound delegation of approval authority</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : delegations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No delegations found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delegator</TableHead>
                  <TableHead>Delegatee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Leave Types</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delegations.map((delegation) => (
                  <TableRow key={delegation.id}>
                    <TableCell>
                      {delegation.delegator ? (
                        <div>
                          <div className="font-medium">
                            {delegation.delegator.firstName} {delegation.delegator.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{delegation.delegator.staffId}</div>
                        </div>
                      ) : (
                        delegation.delegatorId
                      )}
                    </TableCell>
                    <TableCell>
                      {delegation.delegatee ? (
                        <div>
                          <div className="font-medium">
                            {delegation.delegatee.firstName} {delegation.delegatee.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{delegation.delegatee.staffId}</div>
                        </div>
                      ) : (
                        delegation.delegateeId
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div className="text-sm">
                          <div>{format(new Date(delegation.startDate), 'MMM dd, yyyy')}</div>
                          <div className="text-muted-foreground">to {format(new Date(delegation.endDate), 'MMM dd, yyyy')}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {delegation.leaveTypes.length === 0 ? (
                        <Badge variant="outline">All Types</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {delegation.leaveTypes.map(type => (
                            <Badge key={type} variant="secondary">{type}</Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(delegation.status, delegation.endDate)}
                    </TableCell>
                    <TableCell>
                      {delegation.status === 'active' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowRevokeDialog(delegation.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Delegation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Approval Delegation</DialogTitle>
            <DialogDescription>
              Delegate your approval authority to another staff member for a specific time period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="delegateeId">Delegate To *</Label>
              <Select
                value={formData.delegateeId}
                onValueChange={(value) => setFormData({ ...formData, delegateeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(staff => (
                    <SelectItem key={staff.staffId} value={staff.staffId}>
                      {staff.firstName} {staff.lastName} ({staff.staffId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Leave Types (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select specific leave types. Leave empty to delegate all types.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {leaveTypes.map(type => (
                  <Button
                    key={type}
                    type="button"
                    variant={formData.leaveTypes.includes(type) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleLeaveType(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this delegation..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>
                Create Delegation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={showRevokeDialog !== null} onOpenChange={(open) => !open && setShowRevokeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Delegation</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this delegation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRevokeDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => showRevokeDialog && handleRevoke(showRevokeDialog)}>
              Revoke
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

