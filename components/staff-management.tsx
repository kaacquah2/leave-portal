'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Edit2, AlertCircle, UserX, Building2, MapPin } from 'lucide-react'
import StaffForm from './staff-form'
import TerminateStaffDialog from './terminate-staff-dialog'
import { PermissionChecks, UnitBasedPermissions, type UserRole, hasPermission } from '@/lib/permissions'
import { mapToMoFARole, getRoleDisplayName } from '@/lib/role-mapping'

interface StaffManagementProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  userRole: string
  currentStaff?: {
    unit?: string | null
    directorate?: string | null
    dutyStation?: string | null
  } | null
}

export default function StaffManagement({ store, userRole, currentStaff }: StaffManagementProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [terminatingId, setTerminatingId] = useState<string | null>(null)
  
  // Normalize role to MoFA role code
  const normalizedRole = mapToMoFARole(userRole)
  const role = normalizedRole as UserRole
  
  // Get current user's organizational info
  const userUnit = currentStaff?.unit || null
  const userDirectorate = currentStaff?.directorate || null
  const userDutyStation = currentStaff?.dutyStation || null
  
  // Permission checks using MoFA roles
  const canCreateEmployee = PermissionChecks.canCreateEmployee(role)
  const canViewAllEmployees = PermissionChecks.canViewAllEmployees(role)
  const canViewTeamEmployees = PermissionChecks.canViewTeamEmployees(role)
  const canEditEmployeeSalary = PermissionChecks.canEditEmployeeSalary(role)
  const canViewOwnUnit = PermissionChecks.canViewOwnUnit?.(role) ?? false
  const canViewOwnDirectorate = PermissionChecks.canViewOwnDirectorate?.(role) ?? false
  const canViewOwnRegion = PermissionChecks.canViewOwnRegion?.(role) ?? false
  const canViewAllOrg = PermissionChecks.canViewAllOrg?.(role) ?? false
  
  // HR roles can edit employees
  const canEditEmployees = hasPermission(role, 'employee:update') && 
    (normalizedRole === 'HR_OFFICER' || normalizedRole === 'HR_DIRECTOR' || normalizedRole === 'SYS_ADMIN' || 
     normalizedRole === 'hr' || normalizedRole === 'admin')

  const getRoleTheme = () => {
    if (normalizedRole === 'HR_OFFICER' || normalizedRole === 'HR_DIRECTOR' || normalizedRole === 'hr') {
      return {
        gradient: 'from-green-50 to-background',
        accent: 'text-green-600',
        border: 'border-green-200',
      }
    }
    if (normalizedRole === 'DIRECTOR' || normalizedRole === 'directorate_head' || normalizedRole === 'deputy_director') {
      return {
        gradient: 'from-blue-50 to-background',
        accent: 'text-blue-600',
        border: 'border-blue-200',
      }
    }
    if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
      return {
        gradient: 'from-purple-50 to-background',
        accent: 'text-purple-600',
        border: 'border-purple-200',
      }
    }
    return {
      gradient: 'from-background to-background',
      accent: 'text-primary',
      border: 'border-border',
    }
  }

  const theme = getRoleTheme()

  // Filter staff based on MoFA organizational structure and role permissions
  const availableStaff = useMemo(() => {
    let staff = store.staff || []
    
    // HR roles, HR Director, Chief Director, SYS_ADMIN, and AUDITOR can view all
    if (canViewAllEmployees || canViewAllOrg) {
      return staff
    }
    
    // Employees can only view their own record
    if (normalizedRole === 'EMPLOYEE' || normalizedRole === 'employee') {
      // This would be filtered by staffId in the API, but for client-side filtering:
      return staff.filter((s: any) => s.staffId === (currentStaff as any)?.staffId)
    }
    
    // Regional Manager: Filter by duty station (Region/District)
    if (normalizedRole === 'REGIONAL_MANAGER' || normalizedRole === 'regional_manager') {
      if (canViewOwnRegion && userDutyStation) {
        return staff.filter((s: any) => 
          UnitBasedPermissions.canViewRegionStaff(role, userDutyStation, s.dutyStation)
        )
      }
    }
    
    // Director: Filter by directorate
    if (normalizedRole === 'DIRECTOR' || normalizedRole === 'directorate_head' || normalizedRole === 'deputy_director') {
      if (canViewOwnDirectorate && userDirectorate) {
        return staff.filter((s: any) => 
          UnitBasedPermissions.canViewDirectorateStaff(role, userDirectorate, s.directorate)
        )
      }
    }
    
    // Division Head: Filter by directorate (similar to Director)
    if (normalizedRole === 'DIVISION_HEAD' || normalizedRole === 'division_head') {
      if (canViewOwnDirectorate && userDirectorate) {
        return staff.filter((s: any) => 
          UnitBasedPermissions.canViewDirectorateStaff(role, userDirectorate, s.directorate)
        )
      }
    }
    
    // Unit Head: Filter by unit
    if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
      if (canViewOwnUnit && userUnit) {
        return staff.filter((s: any) => 
          UnitBasedPermissions.canViewUnitStaff(role, userUnit, s.unit)
        )
      }
    }
    
    // Supervisor: Filter by direct reports (managerId)
    if (normalizedRole === 'SUPERVISOR' || normalizedRole === 'supervisor' || normalizedRole === 'manager') {
      if (canViewTeamEmployees && (currentStaff as any)?.staffId) {
        // Filter by managerId matching current user's staffId
        const currentStaffId = (currentStaff as any)?.staffId
        return staff.filter((s: any) => s.managerId === currentStaffId || s.immediateSupervisorId === currentStaffId)
      }
    }
    
    // Default: return empty array if no permission
    return []
  }, [store.staff, normalizedRole, canViewAllEmployees, canViewAllOrg, canViewTeamEmployees, 
      canViewOwnUnit, canViewOwnDirectorate, canViewOwnRegion, userUnit, userDirectorate, userDutyStation, currentStaff, role])
  
  const filteredStaff = availableStaff.filter((s: any) => {
    if (!s) return false
    const searchLower = searchTerm.toLowerCase()
    return (
      (s.firstName || '').toLowerCase().includes(searchLower) ||
      (s.lastName || '').toLowerCase().includes(searchLower) ||
      (s.staffId || '').toLowerCase().includes(searchLower) ||
      (s.department || '').toLowerCase().includes(searchLower) ||
      (s.unit || '').toLowerCase().includes(searchLower) ||
      (s.directorate || '').toLowerCase().includes(searchLower) ||
      (s.position || '').toLowerCase().includes(searchLower)
    )
  })

  const getTitle = () => {
    if (normalizedRole === 'HR_OFFICER' || normalizedRole === 'HR_DIRECTOR' || normalizedRole === 'hr') {
      return 'Staff Management'
    }
    if (normalizedRole === 'AUDITOR' || normalizedRole === 'internal_auditor') {
      return 'Staff Directory (Read-Only)'
    }
    return 'Team Directory'
  }

  const getSubtitle = () => {
    if (normalizedRole === 'HR_OFFICER' || normalizedRole === 'HR_DIRECTOR' || normalizedRole === 'hr') {
      return 'Create, update, and manage all staff records and employee data'
    }
    if (normalizedRole === 'AUDITOR' || normalizedRole === 'internal_auditor') {
      return 'View all staff records (read-only access)'
    }
    if (normalizedRole === 'DIRECTOR' || normalizedRole === 'directorate_head' || normalizedRole === 'deputy_director') {
      return `View staff in ${userDirectorate || 'your directorate'}`
    }
    if (normalizedRole === 'UNIT_HEAD' || normalizedRole === 'unit_head') {
      return `View staff in ${userUnit || 'your unit'}`
    }
    if (normalizedRole === 'REGIONAL_MANAGER' || normalizedRole === 'regional_manager') {
      return `View staff in ${userDutyStation || 'your region'}`
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
            placeholder="Search by name, ID, department, unit, or directorate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Photo</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Staff ID</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Name</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Unit</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Directorate</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Position</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Grade</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Duty Station</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Status</th>
                  {canEditEmployees && (
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={canEditEmployees ? 10 : 9} className="py-8 px-4 text-center text-muted-foreground">
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
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{member.firstName} {member.lastName}</span>
                          {member.rank && (
                            <span className="text-xs text-muted-foreground">{member.rank}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                        {member.unit ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate max-w-[150px]" title={member.unit}>{member.unit}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                        {member.directorate ? (
                          <span className="truncate max-w-[150px]" title={member.directorate}>{member.directorate}</span>
                        ) : (
                          <span className="text-muted-foreground">Chief Director</span>
                        )}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">{member.position}</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                        <div className="flex flex-col">
                          <span>{member.grade}</span>
                          {member.step && (
                            <span className="text-xs text-muted-foreground">Step {member.step}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                        {member.dutyStation ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <Badge variant="outline" className="text-xs">
                              {member.dutyStation}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">HQ</Badge>
                        )}
                      </td>
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
                      {canEditEmployees && (
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
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
                          </div>
                        </td>
                      )}
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
