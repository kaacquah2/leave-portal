'use client'

import { useState, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Upload, X } from 'lucide-react'
import type { StaffMember, useDataStore } from '@/lib/data-store'

interface StaffFormProps {
  store: ReturnType<typeof useDataStore>
  editingId: string | null
  userRole?: 'admin' | 'hr' | 'manager'
  onClose: () => void
}

export default function StaffForm({ store, editingId, userRole, onClose }: StaffFormProps) {
  const editingStaff = useMemo(() => 
    editingId ? store.staff.find(s => s.id === editingId) : null,
    [editingId, store.staff]
  )

  const [formData, setFormData] = useState({
    staffId: editingStaff?.staffId || '',
    firstName: editingStaff?.firstName || '',
    lastName: editingStaff?.lastName || '',
    email: editingStaff?.email || '',
    phone: editingStaff?.phone || '',
    department: editingStaff?.department || '',
    position: editingStaff?.position || '',
    grade: editingStaff?.grade || '',
    level: editingStaff?.level || '',
    joinDate: editingStaff?.joinDate || '',
    active: editingStaff?.active ?? true,
    photoUrl: editingStaff?.photoUrl || '',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const departments = ['Aquaculture', 'Fisheries', 'Administration', 'Finance', 'Operations']
  const grades = ['Grade A', 'Grade B', 'Grade C', 'Grade D']
  const levels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, photoUrl: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setFormData({ ...formData, photoUrl: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (editingId) {
        await store.updateStaff(editingId, formData)
      } else {
        await store.addStaff(formData)
      }
      onClose()
    } catch (error) {
      console.error('Error saving staff:', error)
      alert('Failed to save staff member. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Photo Upload Section */}
      <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-border rounded-lg">
        <div className="flex items-center gap-4">
          <Avatar className="w-24 h-24">
            {formData.photoUrl ? (
              <AvatarImage src={formData.photoUrl} alt={`${formData.firstName} ${formData.lastName}`} />
            ) : null}
            <AvatarFallback className="text-2xl">
              {formData.firstName && formData.lastName
                ? `${formData.firstName[0]}${formData.lastName[0]}`
                : 'PH'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {formData.photoUrl ? 'Change Photo' : 'Upload Photo'}
              </Button>
              {formData.photoUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemovePhoto}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG or GIF (max. 5MB)
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="staffId">Staff ID</Label>
          <Input
            id="staffId"
            value={formData.staffId}
            onChange={(e) => setFormData({...formData, staffId: e.target.value})}
            placeholder="MFA-001"
            required
          />
        </div>
        <div>
          <Label htmlFor="joinDate">Join Date</Label>
          <Input
            id="joinDate"
            type="date"
            value={formData.joinDate}
            onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <select
            id="department"
            value={formData.department}
            onChange={(e) => setFormData({...formData, department: e.target.value})}
            className="w-full px-3 py-2 border border-input rounded-md"
            required
          >
            <option value="">Select Department</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={formData.position}
            onChange={(e) => setFormData({...formData, position: e.target.value})}
            required
          />
        </div>
        <div>
          <Label htmlFor="grade">Grade</Label>
          <select
            id="grade"
            value={formData.grade}
            onChange={(e) => setFormData({...formData, grade: e.target.value})}
            className="w-full px-3 py-2 border border-input rounded-md"
            required
          >
            <option value="">Select Grade</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="level">Level</Label>
          <select
            id="level"
            value={formData.level}
            onChange={(e) => setFormData({...formData, level: e.target.value})}
            className="w-full px-3 py-2 border border-input rounded-md"
            required
          >
            <option value="">Select Level</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 py-2">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) => setFormData({...formData, active: e.target.checked})}
            className="rounded"
          />
          <Label htmlFor="active" className="mb-0">Active</Label>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="bg-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'} Staff Member
        </Button>
      </div>
    </form>
  )
}
