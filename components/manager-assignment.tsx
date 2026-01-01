'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Users, UserCheck, AlertCircle } from 'lucide-react'
import type { useDataStore } from '@/lib/data-store'

interface ManagerAssignmentProps {
  store: ReturnType<typeof useDataStore>
  staffId?: string // Optional: for single staff assignment
}

export default function ManagerAssignment({ store, staffId }: ManagerAssignmentProps) {
  const [selectedStaff, setSelectedStaff] = useState<string>(staffId || '')
  const [selectedManager, setSelectedManager] = useState<string>('none')
  const [currentManager, setCurrentManager] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [bulkStaffIds, setBulkStaffIds] = useState<string[]>([])
  const { toast } = useToast()

  // Get managers (staff with manager role or specific criteria)
  const managers = store.staff.filter(s => {
    // Filter staff who could be managers (you may want to add a flag or check role)
    // For now, we'll show all active staff as potential managers
    return s.active && s.employmentStatus === 'active'
  })

  // Load current manager assignment when staff is selected
  useEffect(() => {
    if (selectedStaff) {
      loadManagerAssignment(selectedStaff)
    } else {
      setCurrentManager(null)
      setTeamMembers([])
    }
  }, [selectedStaff])

  const loadManagerAssignment = async (staffId: string) => {
    try {
      const staff = store.staff.find(s => s.staffId === staffId)
      if (!staff) return

      // Find manager
      if (staff.managerId) {
        const manager = store.staff.find(s => s.staffId === staff.managerId)
        setCurrentManager(manager || null)
      } else {
        setCurrentManager(null)
      }

      // Find team members
      const members = store.staff.filter(s => s.managerId === staffId)
      setTeamMembers(members)
    } catch (error) {
      console.error('Error loading manager assignment:', error)
    }
  }

  const handleAssign = async () => {
    if (!selectedStaff && !isBulkMode) {
      toast({
        title: 'Error',
        description: 'Please select a staff member',
        variant: 'destructive',
      })
      return
    }

    if (isBulkMode && bulkStaffIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one staff member',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      if (isBulkMode) {
        // Bulk assignment
        const { apiRequest } = await import('@/lib/api-config')
        const response = await apiRequest('/api/staff/bulk-assign-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            staffIds: bulkStaffIds,
            managerId: selectedManager && selectedManager !== 'none' ? selectedManager : null,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to assign manager')
        }

        const result = await response.json()
        toast({
          title: 'Success',
          description: `Assigned manager to ${result.processed} staff member(s). ${result.failed} failed.`,
        })

        // Refresh data
        store.refresh()
        setBulkStaffIds([])
        setSelectedManager('')
      } else {
        // Single assignment
        const staff = store.staff.find(s => s.staffId === selectedStaff)
        if (!staff) {
          throw new Error('Staff member not found')
        }

        const response = await fetch(`/api/staff/${staff.id}/assign-manager`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            managerId: selectedManager && selectedManager !== 'none' ? selectedManager : null,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to assign manager')
        }

        toast({
          title: 'Success',
          description: selectedManager && selectedManager !== 'none'
            ? 'Manager assigned successfully'
            : 'Manager removed successfully',
        })

        // Refresh data
        store.refresh()
        loadManagerAssignment(selectedStaff)
        setSelectedManager('')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign manager',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveManager = async () => {
    if (!selectedStaff) return

    setIsLoading(true)
    try {
      const staff = store.staff.find(s => s.staffId === selectedStaff)
      if (!staff) {
        throw new Error('Staff member not found')
      }

      const response = await fetch(`/api/staff/${staff.id}/assign-manager`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          managerId: null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove manager')
      }

      toast({
        title: 'Success',
        description: 'Manager removed successfully',
      })

      store.refresh()
      loadManagerAssignment(selectedStaff)
      setSelectedManager('')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove manager',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Manager Assignment</h2>
        <p className="text-muted-foreground">Assign managers to staff members for team-based leave management</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Mode</CardTitle>
          <CardDescription>Choose between single or bulk assignment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={!isBulkMode ? 'default' : 'outline'}
              onClick={() => setIsBulkMode(false)}
            >
              Single Assignment
            </Button>
            <Button
              variant={isBulkMode ? 'default' : 'outline'}
              onClick={() => setIsBulkMode(true)}
            >
              Bulk Assignment
            </Button>
          </div>

          {!isBulkMode ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="staff">Staff Member</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {store.staff
                      .filter(s => s.active && s.employmentStatus === 'active')
                      .map(s => (
                        <SelectItem key={s.id} value={s.staffId}>
                          {s.staffId} - {s.firstName} {s.lastName} ({s.department})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStaff && (
                <div className="space-y-4">
                  {currentManager && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Current Manager:</strong> {currentManager.firstName} {currentManager.lastName} ({currentManager.staffId})
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveManager}
                          className="ml-2"
                        >
                          Remove
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {teamMembers.length > 0 && (
                    <div>
                      <Label>Team Members ({teamMembers.length})</Label>
                      <div className="mt-2 space-y-1">
                        {teamMembers.map(member => (
                          <div key={member.id} className="text-sm text-muted-foreground">
                            {member.staffId} - {member.firstName} {member.lastName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="manager">Assign Manager</Label>
                    <Select value={selectedManager} onValueChange={setSelectedManager}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager (or leave empty to remove)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Remove Manager)</SelectItem>
                        {managers
                          .filter(m => m.staffId !== selectedStaff)
                          .map(m => (
                            <SelectItem key={m.id} value={m.staffId}>
                              {m.staffId} - {m.firstName} {m.lastName} ({m.position})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleAssign} disabled={isLoading}>
                    {isLoading ? 'Assigning...' : selectedManager && selectedManager !== 'none' ? 'Assign Manager' : 'Remove Manager'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Select Staff Members</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                  {store.staff
                    .filter(s => s.active && s.employmentStatus === 'active')
                    .map(s => (
                      <div key={s.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={s.id}
                          checked={bulkStaffIds.includes(s.staffId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkStaffIds([...bulkStaffIds, s.staffId])
                            } else {
                              setBulkStaffIds(bulkStaffIds.filter(id => id !== s.staffId))
                            }
                          }}
                        />
                        <label htmlFor={s.id} className="text-sm cursor-pointer">
                          {s.staffId} - {s.firstName} {s.lastName} ({s.department})
                        </label>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {bulkStaffIds.length} staff member(s) selected
                </p>
              </div>

              <div>
                <Label htmlFor="bulk-manager">Assign Manager to Selected Staff</Label>
                <Select value={selectedManager} onValueChange={setSelectedManager}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager (or leave empty to remove)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Remove Manager)</SelectItem>
                    {managers.map(m => (
                      <SelectItem key={m.id} value={m.staffId}>
                        {m.staffId} - {m.firstName} {m.lastName} ({m.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAssign} disabled={isLoading || bulkStaffIds.length === 0}>
                {isLoading
                  ? 'Assigning...'
                  : `Assign Manager to ${bulkStaffIds.length} Staff Member(s)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manager Overview</CardTitle>
          <CardDescription>View all managers and their team sizes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {managers.map(manager => {
              const teamSize = store.staff.filter(s => s.managerId === manager.staffId).length
              return (
                <div key={manager.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {manager.firstName} {manager.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {manager.staffId} - {manager.position}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{teamSize} team member(s)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

