'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Edit2, Trash2, AlertCircle, UserX } from 'lucide-react'
import StaffForm from './staff-form'
import TerminateStaffDialog from './terminate-staff-dialog'
import { PermissionChecks, type UserRole } from '@/lib/permissions'

interface StaffManagementProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  userRole: string
}

export default function StaffManagement({ store, userRole }: StaffManagementProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [terminatingId, setTerminatingId] = useState<string | null>(null)
  
  const role = userRole as UserRole
  
  // Permission checks
  const canCreateEmployee = PermissionChecks.canCreateEmployee(role)
  const canViewAllEmployees = PermissionChecks.canViewAllEmployees(role)
  const canViewTeamEmployees = PermissionChecks.canViewTeamEmployees(role)
  const canEditEmployeeSalary = PermissionChecks.canEditEmployeeSalary(role)
  
  // Admin should NOT be able to create/edit employees (HR responsibility)
  const canEditEmployees = role === 'hr'
  
  // Manager should only see their team (for now, we'll show all but in production would filter by team)
  const shouldShowTeamOnly = role === 'manager'

  const getRoleTheme = () => {
    switch (userRole) {
      case 'hr':
        return {
          gradient: 'from-green-50 to-background',
          accent: 'text-green-600',
          border: 'border-green-200',
        }
      default:
        return {
          gradient: 'from-background to-background',
          accent: 'text-primary',
          border: 'border-border',
        }
    }
  }

  const theme = getRoleTheme()

  // Filter staff based on role permissions
  let availableStaff = store.staff || []
  
  // Manager should only see their team (in production, filter by manager's department/team)
  if (shouldShowTeamOnly) {
    // For demo purposes, showing all staff, but in production would filter by manager's team
    // availableStaff = (store.staff || []).filter(s => s.department === managerDepartment)
  }
  
  const filteredStaff = availableStaff.filter((s: any) => {
    if (!s) return false
    const searchLower = searchTerm.toLowerCase()
    return (
      (s.firstName || '').toLowerCase().includes(searchLower) ||
      (s.lastName || '').toLowerCase().includes(searchLower) ||
      (s.staffId || '').toLowerCase().includes(searchLower) ||
      (s.department || '').toLowerCase().includes(searchLower)
    )
  })

  const getTitle = () => {
    if (role === 'hr') return 'Staff Management'
    return 'Team Directory'
  }

  const getSubtitle = () => {
    if (role === 'hr') {
      return 'Create, update, and manage all staff records and employee data'
    }
    return 'View your team members\' information'
  }

  return (
    <div className={`p-8 space-y-6 bg-gradient-to-b ${theme.gradient}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{getTitle()}</h1>
          <p className="text-muted-foreground">{getSubtitle()}</p>
        </div>
        {!showForm && canCreateEmployee && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Staff
          </Button>
        )}
      </div>

      {showForm && canCreateEmployee && (
        <Card className={`border-2 ${theme.border}`}>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Staff Member' : 'Add New Staff Member'}</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffForm
              store={store}
              editingId={editingId}
              userRole={role === 'employee' ? undefined : role}
              onClose={() => {
                setShowForm(false)
                setEditingId(null)
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card className={`border-2 ${theme.border}`}>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            Total: {availableStaff.length} staff members
            {searchTerm && ` (${filteredStaff.length} filtered)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by name, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Photo</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Staff ID</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Name</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Department</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Position</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Grade</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Status</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 px-4 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
                        <p className="font-medium">
                          {availableStaff.length === 0
                            ? 'No staff members found. Add your first staff member to get started.'
                            : searchTerm
                            ? `No staff members match "${searchTerm}"`
                            : 'No staff members found'}
                        </p>
                        {availableStaff.length === 0 && canCreateEmployee && (
                          <Button
                            size="sm"
                            onClick={() => setShowForm(true)}
                            className="mt-2"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Staff Member
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member: any) => (
                    <tr key={member.id} className="hover:bg-secondary/5">
                      <td className="py-2 sm:py-3 px-2 sm:px-4">
                        <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                          {member.photoUrl ? (
                            <AvatarImage src={member.photoUrl} alt={`${member.firstName} ${member.lastName}`} />
                          ) : null}
                          <AvatarFallback>
                            {member.firstName[0]}{member.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm">{member.staffId}</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">{member.firstName} {member.lastName}</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">{member.department}</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">{member.position}</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">{member.grade}</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant={member.active ? 'default' : 'secondary'}>
                            {member.active ? 'Active' : 'Inactive'}
                          </Badge>
                          {member.employmentStatus && member.employmentStatus !== 'active' && (
                            <Badge variant="destructive" className="text-xs">
                              {member.employmentStatus.charAt(0).toUpperCase() + member.employmentStatus.slice(1)}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {canEditEmployees && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(member.id)
                                  setShowForm(true)
                                }}
                                disabled={member.employmentStatus === 'terminated'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {member.active && member.employmentStatus !== 'terminated' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setTerminatingId(member.id)}
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {terminatingId && (() => {
        const member = store.staff.find((s: any) => s.id === terminatingId)
        if (!member) return null
        return (
          <TerminateStaffDialog
            open={!!terminatingId}
            onOpenChange={(open) => !open && setTerminatingId(null)}
            staffMember={{
              id: member.id,
              staffId: member.staffId,
              firstName: member.firstName,
              lastName: member.lastName,
            }}
            onTerminate={async (data) => {
              await store.terminateStaff(terminatingId, data.terminationDate, data.terminationReason, data.employmentStatus)
              setTerminatingId(null)
            }}
          />
        )
      })()}
    </div>
  )
}
