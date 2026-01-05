'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, UserPlus, Edit, Save, X, Shield, Users } from 'lucide-react'
import { apiRequest } from '@/lib/api'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  role: string
  staffId?: string
  active: boolean
  emailVerified: boolean
  lastLogin?: string
  staff?: {
    staffId: string
    firstName: string
    lastName: string
    department: string
    position: string
  }
}

const AVAILABLE_ROLES = [
  'employee',
  'supervisor',
  'unit_head',
  'division_head',
  'directorate_head',
  'regional_manager',
  'hr_officer',
  'hr_director',
  'chief_director',
  'internal_auditor',
  'admin',
  // Legacy roles
  'hr',
  'hr_assistant',
  'manager',
  'deputy_director',
]

export default function UserRoleManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editActive, setEditActive] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await apiRequest('/api/admin/users')

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data)
    } catch (err: any) {
      toast.error('Failed to load users')
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleEdit = (user: User) => {
    setEditingUserId(user.id)
    setEditRole(user.role)
    setEditActive(user.active)
  }

  const handleCancel = () => {
    setEditingUserId(null)
    setEditRole('')
    setEditActive(false)
  }

  const handleSave = async (userId: string) => {
    try {
      const response = await apiRequest(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: editRole,
          active: editActive,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      toast.success('User updated successfully')
      setEditingUserId(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user')
    }
  }

  const getRoleColor = (role: string) => {
    if (role === 'admin' || role.includes('ADMIN')) return 'bg-purple-100 text-purple-800'
    if (role.includes('hr') || role.includes('HR')) return 'bg-blue-100 text-blue-800'
    if (role.includes('director') || role.includes('chief')) return 'bg-green-100 text-green-800'
    if (role.includes('manager') || role.includes('head')) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      user.email.toLowerCase().includes(search) ||
      user.role.toLowerCase().includes(search) ||
      (user.staffId && user.staffId.toLowerCase().includes(search)) ||
      (user.staff?.firstName && user.staff.firstName.toLowerCase().includes(search)) ||
      (user.staff?.lastName && user.staff.lastName.toLowerCase().includes(search))
    )
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              User Role Management
            </CardTitle>
            <CardDescription>Manage user roles and permissions</CardDescription>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="sm" disabled={loading}>
            <Users className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search users by email, role, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Role</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Last Login</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        {user.staff && (
                          <p className="text-sm text-muted-foreground">
                            {user.staff.firstName} {user.staff.lastName} ({user.staffId})
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {editingUserId === user.id ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          {AVAILABLE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role.replace(/_/g, ' ').toUpperCase()}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge className={getRoleColor(user.role)}>
                          {user.role.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {editingUserId === user.id ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                      ) : (
                        <Badge variant={user.active ? 'default' : 'secondary'}>
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="p-3">
                      {editingUserId === user.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(user.id)}
                            className="gap-1"
                          >
                            <Save className="w-3 h-3" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            className="gap-1"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(user)}
                          className="gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

