'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react'
import StaffForm from './staff-form'
import type { ReturnType } from '@/lib/data-store'
import { PermissionChecks, type UserRole } from '@/lib/permissions'

interface StaffManagementProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  userRole: string
}

export default function StaffManagement({ store, userRole }: StaffManagementProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
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
  let availableStaff = store.staff
  
  // Manager should only see their team (in production, filter by manager's department/team)
  if (shouldShowTeamOnly) {
    // For demo purposes, showing all staff, but in production would filter by manager's team
    // availableStaff = store.staff.filter(s => s.department === managerDepartment)
  }
  
  const filteredStaff = availableStaff.filter(s =>
    s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
              userRole={role}
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
          <CardDescription>Total: {filteredStaff.length} staff members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by name, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Photo</th>
                  <th className="text-left py-3 px-4 font-semibold">Staff ID</th>
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Department</th>
                  <th className="text-left py-3 px-4 font-semibold">Position</th>
                  <th className="text-left py-3 px-4 font-semibold">Grade</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStaff.map(member => (
                  <tr key={member.id} className="hover:bg-secondary/5">
                    <td className="py-3 px-4">
                      <Avatar className="w-10 h-10">
                        {member.photoUrl ? (
                          <AvatarImage src={member.photoUrl} alt={`${member.firstName} ${member.lastName}`} />
                        ) : null}
                        <AvatarFallback>
                          {member.firstName[0]}{member.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="py-3 px-4 font-medium">{member.staffId}</td>
                    <td className="py-3 px-4">{member.firstName} {member.lastName}</td>
                    <td className="py-3 px-4">{member.department}</td>
                    <td className="py-3 px-4">{member.position}</td>
                    <td className="py-3 px-4">{member.grade}</td>
                    <td className="py-3 px-4">
                      <Badge variant={member.active ? 'default' : 'secondary'}>
                        {member.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {canEditEmployees && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(member.id)
                              setShowForm(true)
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
