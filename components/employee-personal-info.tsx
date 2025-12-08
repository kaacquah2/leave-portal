'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import type { ReturnType } from '@/lib/data-store'

interface EmployeePersonalInfoProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  staffId: string
}

export default function EmployeePersonalInfo({ store, staffId }: EmployeePersonalInfoProps) {
  const staff = store.staff.find(s => s.staffId === staffId)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: staff?.firstName || '',
    lastName: staff?.lastName || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
  })

  if (!staff) {
    return <div className="p-8">Staff member not found</div>
  }

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    const staffMember = store.staff.find(s => s.id === staff.id)
    if (staffMember) {
      setIsSaving(true)
      try {
        await store.updateStaff(staffMember.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        })
        setIsEditing(false)
      } catch (error) {
        console.error('Error updating personal info:', error)
        alert('Failed to update personal information. Please try again.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleCancel = () => {
    setFormData({
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone,
    })
    setIsEditing(false)
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personal Information</h1>
          <p className="text-muted-foreground mt-1">Update your personal details</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Save className="w-4 h-4" />
            Edit
          </Button>
        )}
      </div>

      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
          <CardDescription>Your personal information that you can update</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle>Employment Information</CardTitle>
          <CardDescription>Your employment details (read-only)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Staff ID</Label>
              <p className="font-medium">{staff.staffId}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Department</Label>
              <p className="font-medium">{staff.department}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Position</Label>
              <p className="font-medium">{staff.position}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Grade</Label>
              <p className="font-medium">{staff.grade}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Level</Label>
              <p className="font-medium">{staff.level}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Join Date</Label>
              <p className="font-medium">{new Date(staff.joinDate).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

