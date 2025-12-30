'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, Shield, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  role: string
  staffId?: string
  active: boolean
  emailVerified: boolean
  lastLogin?: string
  staff?: {
    firstName: string
    lastName: string
    department: string
  }
}

interface StaffMember {
  staffId: string
  firstName: string
  lastName: string
  department: string
  email?: string
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showCreateCredentialsDialog, setShowCreateCredentialsDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatingCredentials, setIsCreatingCredentials] = useState(false)
  const [formData, setFormData] = useState({
    // User account fields
    email: '',
    password: '',
    role: 'employee',
    active: true,
    // Staff member fields
    staffId: '',
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
    position: '',
    grade: '',
    level: '',
    joinDate: '',
  })
  const [credentialsFormData, setCredentialsFormData] = useState({
    staffId: '',
    email: '',
    password: '',
    role: 'employee',
    active: true,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showCredentialsPassword, setShowCredentialsPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    fetchUsers()
    fetchStaffMembers()
  }, [])

  const fetchStaffMembers = async () => {
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/staff', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setStaffMembers(data)
      }
    } catch (error) {
      console.error('Error fetching staff members:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/admin/users')

      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.staffId || !formData.firstName || !formData.lastName || 
          !formData.email || !formData.phone || !formData.department || 
          !formData.position || !formData.grade || !formData.level || 
          !formData.joinDate || !formData.password) {
        setError('Please fill in all required fields')
        return
      }

      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          // User account fields
          email: formData.email,
          password: formData.password,
          role: formData.role,
          active: formData.active,
          // Staff member fields
          staffId: formData.staffId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
          grade: formData.grade,
          level: formData.level,
          joinDate: formData.joinDate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create user and employee record')
        return
      }

      // Show success message
      if (data.emailSent) {
        setSuccessMessage(`User account created successfully! Login credentials have been sent to ${data.email}`)
      } else {
        setSuccessMessage(`User account created successfully! However, the email notification failed. Please manually provide the credentials to the user.`)
      }

      // Reset form and close dialog
      setFormData({
        email: '',
        password: '',
        role: 'employee',
        active: true,
        staffId: '',
        firstName: '',
        lastName: '',
        phone: '',
        department: '',
        position: '',
        grade: '',
        level: '',
        joinDate: '',
      })
      setShowAddDialog(false)
      
      // Refresh users and staff lists
      fetchUsers()
      fetchStaffMembers()

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('')
      }, 5000)
    } catch (error) {
      console.error('Error creating user:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsCreatingCredentials(true)

    try {
      // Validate required fields
      if (!credentialsFormData.staffId || !credentialsFormData.email || 
          !credentialsFormData.password || !credentialsFormData.role) {
        setError('Please fill in all required fields')
        return
      }

      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/admin/users/create-credentials', {
        method: 'POST',
        body: JSON.stringify({
          staffId: credentialsFormData.staffId,
          email: credentialsFormData.email,
          password: credentialsFormData.password,
          role: credentialsFormData.role,
          active: credentialsFormData.active,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create login credentials')
        return
      }

      // Show success message
      if (data.emailSent) {
        setSuccessMessage(`Login credentials created successfully! Credentials have been sent to ${data.user.email}`)
      } else {
        setSuccessMessage(`Login credentials created successfully! However, the email notification failed. Password: ${data.password || 'N/A'}`)
      }

      // Reset form and close dialog
      setCredentialsFormData({
        staffId: '',
        email: '',
        password: '',
        role: 'employee',
        active: true,
      })
      setShowCreateCredentialsDialog(false)
      
      // Refresh users list
      fetchUsers()
      fetchStaffMembers()

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('')
      }, 5000)
    } catch (error) {
      console.error('Error creating credentials:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setIsCreatingCredentials(false)
    }
  }

  // Get staff members without user accounts
  const staffWithoutUsers = staffMembers.filter((staff) => {
    return !users.some((user) => user.staffId === staff.staffId)
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/10 text-primary'
      case 'hr':
        return 'bg-green-100 text-green-800'
      case 'manager':
        return 'bg-amber-100 text-amber-800'
      case 'employee':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-8">Loading users...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={() => setShowCreateCredentialsDialog(true)}
          >
            <Shield className="w-4 h-4" />
            Create Credentials for Existing Staff
          </Button>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" />
            Add New Staff & User
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee & User Account</DialogTitle>
            <DialogDescription>
              Create a new employee record and user account. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
            <div className="space-y-4 py-4">
              {/* Employee Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Employee Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="staffId">Staff ID *</Label>
                    <Input
                      id="staffId"
                      placeholder="MFA-001"
                      value={formData.staffId}
                      onChange={(e) => setFormData({ ...formData, staffId: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="joinDate">Join Date *</Label>
                    <Input
                      id="joinDate"
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@mofa.gov.gh"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+233 XX XXX XXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aquaculture">Aquaculture</SelectItem>
                        <SelectItem value="Fisheries">Fisheries</SelectItem>
                        <SelectItem value="Administration">Administration</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Human Resources">Human Resources</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                        <SelectItem value="Procurement">Procurement</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position/Job Title *</Label>
                    <Input
                      id="position"
                      placeholder="Senior Officer"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade *</Label>
                    <Select
                      value={formData.grade}
                      onValueChange={(value) => setFormData({ ...formData, grade: value })}
                    >
                      <SelectTrigger id="grade">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Grade A">Grade A</SelectItem>
                        <SelectItem value="Grade B">Grade B</SelectItem>
                        <SelectItem value="Grade C">Grade C</SelectItem>
                        <SelectItem value="Grade D">Grade D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">Level *</Label>
                    <Select
                      value={formData.level}
                      onValueChange={(value) => setFormData({ ...formData, level: value })}
                    >
                      <SelectTrigger id="level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Level 1">Level 1</SelectItem>
                        <SelectItem value="Level 2">Level 2</SelectItem>
                        <SelectItem value="Level 3">Level 3</SelectItem>
                        <SelectItem value="Level 4">Level 4</SelectItem>
                        <SelectItem value="Level 5">Level 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* User Account Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold border-b pb-2">User Account</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password (min 8 characters)"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="hr">HR Officer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false)
                  setError('')
                  setFormData({
                    email: '',
                    password: '',
                    role: 'employee',
                    active: true,
                    staffId: '',
                    firstName: '',
                    lastName: '',
                    phone: '',
                    department: '',
                    position: '',
                    grade: '',
                    level: '',
                    joinDate: '',
                  })
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Credentials Dialog for Existing Staff */}
      <Dialog open={showCreateCredentialsDialog} onOpenChange={setShowCreateCredentialsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Login Credentials</DialogTitle>
            <DialogDescription>
              Create login credentials for an existing staff member who doesn't have a user account yet.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCredentials}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="credentialsStaffId">Staff Member *</Label>
                <Select
                  value={credentialsFormData.staffId}
                  onValueChange={(value) => {
                    const selectedStaff = staffMembers.find(s => s.staffId === value)
                    setCredentialsFormData({
                      ...credentialsFormData,
                      staffId: value,
                      email: selectedStaff?.email || '',
                    })
                  }}
                >
                  <SelectTrigger id="credentialsStaffId">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffWithoutUsers.length === 0 ? (
                      <SelectItem value="" disabled>No staff members without accounts</SelectItem>
                    ) : (
                      staffWithoutUsers.map((staff) => (
                        <SelectItem key={staff.staffId} value={staff.staffId}>
                          {staff.staffId} - {staff.firstName} {staff.lastName} ({staff.department})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {staffWithoutUsers.length} staff member(s) without user accounts
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credentialsEmail">Email Address *</Label>
                <Input
                  id="credentialsEmail"
                  type="email"
                  placeholder="email@mofa.gov.gh"
                  value={credentialsFormData.email}
                  onChange={(e) => setCredentialsFormData({ ...credentialsFormData, email: e.target.value.toLowerCase() })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credentialsPassword">Password *</Label>
                <div className="relative">
                  <Input
                    id="credentialsPassword"
                    type={showCredentialsPassword ? 'text' : 'password'}
                    placeholder="Enter password (min 8 characters)"
                    value={credentialsFormData.password}
                    onChange={(e) => setCredentialsFormData({ ...credentialsFormData, password: e.target.value })}
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCredentialsPassword(!showCredentialsPassword)}
                  >
                    {showCredentialsPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credentialsRole">Role *</Label>
                <Select
                  value={credentialsFormData.role}
                  onValueChange={(value) => setCredentialsFormData({ ...credentialsFormData, role: value })}
                >
                  <SelectTrigger id="credentialsRole">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="unit_head">Unit Head</SelectItem>
                    <SelectItem value="division_head">Division Head</SelectItem>
                    <SelectItem value="directorate_head">Director</SelectItem>
                    <SelectItem value="regional_manager">Regional Manager</SelectItem>
                    <SelectItem value="hr_officer">HR Officer</SelectItem>
                    <SelectItem value="hr_director">HR Director</SelectItem>
                    <SelectItem value="chief_director">Chief Director</SelectItem>
                    <SelectItem value="hr">HR (Legacy)</SelectItem>
                    <SelectItem value="manager">Manager (Legacy)</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="credentialsActive"
                  checked={credentialsFormData.active}
                  onChange={(e) => setCredentialsFormData({ ...credentialsFormData, active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="credentialsActive" className="mb-0">Account Active</Label>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateCredentialsDialog(false)
                  setError('')
                  setCredentialsFormData({
                    staffId: '',
                    email: '',
                    password: '',
                    role: 'employee',
                    active: true,
                  })
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingCredentials || staffWithoutUsers.length === 0}>
                {isCreatingCredentials ? 'Creating...' : 'Create Credentials'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Total: {users.length} users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{user.email}</p>
                      <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                      {!user.active && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    {user.staff && (
                      <p className="text-sm text-muted-foreground">
                        {user.staff.firstName} {user.staff.lastName} - {user.staff.department}
                      </p>
                    )}
                    {user.lastLogin && (
                      <p className="text-xs text-muted-foreground">
                        Last login: {new Date(user.lastLogin).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

