'use client'

import { useState, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Upload, X } from 'lucide-react'
import type { StaffMember, useDataStore } from '@/lib/data-store'
import { MOFA_UNITS, getDirectorateForUnit } from '@/lib/mofa-unit-mapping'

interface StaffFormProps {
  store: ReturnType<typeof useDataStore>
  editingId: string | null
  userRole?: 'admin' | 'hr' | 'manager' | 'hr_assistant' | 'deputy_director' | string
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
    rank: editingStaff?.rank || '',
    step: editingStaff?.step || '',
    directorate: editingStaff?.directorate || '',
    division: (editingStaff as any)?.division || '',
    unit: editingStaff?.unit || '',
    dutyStation: (editingStaff as any)?.dutyStation || 'HQ',
    joinDate: editingStaff?.joinDate || '',
    confirmationDate: (editingStaff as any)?.confirmationDate || '',
    managerId: editingStaff?.managerId || '',
    immediateSupervisorId: (editingStaff as any)?.immediateSupervisorId || '',
    active: editingStaff?.active ?? true,
    employmentStatus: editingStaff?.employmentStatus || 'active',
    terminationDate: editingStaff?.terminationDate || '',
    terminationReason: editingStaff?.terminationReason || '',
    photoUrl: editingStaff?.photoUrl || '',
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Ghana Government Public Service Grade Structure
  const grades = [
    'SSS 1', 'SSS 2', 'SSS 3', 'SSS 4', 'SSS 5', 'SSS 6', // Senior Staff Service
    'PSS 1', 'PSS 2', 'PSS 3', 'PSS 4', 'PSS 5', 'PSS 6', // Principal Staff Service
    'DSS 1', 'DSS 2', 'DSS 3', 'DSS 4', 'DSS 5', 'DSS 6', // Deputy Staff Service
    'USS 1', 'USS 2', 'USS 3', 'USS 4', 'USS 5', 'USS 6', // Upper Staff Service
    'MSS 1', 'MSS 2', 'MSS 3', 'MSS 4', 'MSS 5', 'MSS 6', // Middle Staff Service
    'JSS 1', 'JSS 2', 'JSS 3', 'JSS 4', 'JSS 5', 'JSS 6', // Junior Staff Service
  ]
  
  // Ghana Government Level Structure
  const levels = [
    'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6',
    'Level 7', 'Level 8', 'Level 9', 'Level 10', 'Level 11', 'Level 12'
  ]
  
  // Ghana Government Rank Structure
  const ranks = [
    'Chief Director',
    'Deputy Chief Director',
    'Director',
    'Deputy Director',
    'Principal Officer',
    'Senior Officer',
    'Officer',
    'Assistant Officer',
    'Senior Staff',
    'Staff',
    'Junior Staff'
  ]
  
  // Duty Stations
  const dutyStations = ['HQ', 'Region', 'District', 'Agency']
  
  // Get available staff for manager/supervisor assignment
  const availableManagers = useMemo(() => {
    return (store.staff || []).filter((s: any) => 
      s.id !== editingId && 
      s.active && 
      s.employmentStatus === 'active'
    )
  }, [store.staff, editingId])
  
  // Get unique directorates from MoFA units
  const directorates = useMemo(() => {
    const dirs = new Set<string>()
    MOFA_UNITS.forEach(unit => {
      if (unit.directorate) {
        dirs.add(unit.directorate)
      }
    })
    return Array.from(dirs).sort()
  }, [])
  
  // Get units based on selected directorate
  const availableUnits = useMemo(() => {
    if (!formData.directorate || formData.directorate.trim() === '') {
      // Show units that report to Chief Director (no directorate)
      return MOFA_UNITS
        .filter(u => u.directorate === null)
        .map(u => u.unit)
        .sort()
    }
    // Show units that belong to selected directorate
    return MOFA_UNITS
      .filter(u => u.directorate === formData.directorate)
      .map(u => u.unit)
      .sort()
  }, [formData.directorate])
  
  // Auto-set directorate when unit is selected
  const handleUnitChange = (unit: string) => {
    const unitConfig = MOFA_UNITS.find(u => u.unit === unit)
    if (unitConfig) {
      if (unitConfig.directorate) {
        setFormData(prev => ({ ...prev, unit: unit, directorate: unitConfig.directorate || '' }))
      } else {
        // Unit reports to Chief Director (no directorate)
        setFormData(prev => ({ ...prev, unit: unit, directorate: '', division: '' }))
      }
    } else {
      setFormData(prev => ({ ...prev, unit: unit }))
    }
  }
  
  // Validate organizational structure
  const validateOrganizationalStructure = (): string | null => {
    // If unit is selected, verify it matches the directorate
    if (formData.unit && formData.directorate) {
      const unitConfig = MOFA_UNITS.find(u => u.unit === formData.unit)
      if (unitConfig && unitConfig.directorate && unitConfig.directorate !== formData.directorate) {
        return `Unit "${formData.unit}" belongs to "${unitConfig.directorate}", not "${formData.directorate}"`
      }
    }
    
    // If unit reports to Chief Director, directorate should be empty
    if (formData.unit) {
      const unitConfig = MOFA_UNITS.find(u => u.unit === formData.unit)
      if (unitConfig && !unitConfig.directorate && formData.directorate) {
        return `Unit "${formData.unit}" reports directly to Chief Director. Please clear the directorate field.`
      }
    }
    
    return null
  }

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
    
    // Validate organizational structure
    const orgError = validateOrganizationalStructure()
    if (orgError) {
      alert(orgError)
      return
    }
    
    setIsSubmitting(true)
    try {
      if (editingId) {
        await store.updateStaff(editingId, formData)
      } else {
        await store.addStaff(formData)
      }
      onClose()
    } catch (error: any) {
      console.error('Error saving staff:', error)
      alert(error.message || 'Failed to save staff member. Please try again.')
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
          <Label htmlFor="confirmationDate">Confirmation Date (Optional)</Label>
          <Input
            id="confirmationDate"
            type="date"
            value={formData.confirmationDate}
            onChange={(e) => setFormData({...formData, confirmationDate: e.target.value})}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Date when staff was confirmed after probation period
          </p>
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
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => setFormData({...formData, department: e.target.value})}
            placeholder="e.g., Fisheries, Aquaculture, Administration"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Department name (can be different from unit)
          </p>
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
        <div>
          <Label htmlFor="rank">Rank</Label>
          <select
            id="rank"
            value={formData.rank}
            onChange={(e) => setFormData({...formData, rank: e.target.value})}
            className="w-full px-3 py-2 border border-input rounded-md"
          >
            <option value="">Select Rank</option>
            {ranks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="step">Step</Label>
          <Input
            id="step"
            type="number"
            min="1"
            max="15"
            value={formData.step}
            onChange={(e) => setFormData({...formData, step: e.target.value})}
            placeholder="Step within grade (1-15)"
          />
        </div>
      </div>
      
      {/* Manager/Supervisor Assignment Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-4">Reporting Structure</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="immediateSupervisorId">Immediate Supervisor</Label>
            <select
              id="immediateSupervisorId"
              value={formData.immediateSupervisorId}
              onChange={(e) => setFormData({...formData, immediateSupervisorId: e.target.value})}
              className="w-full px-3 py-2 border border-input rounded-md"
            >
              <option value="">Select Immediate Supervisor</option>
              {availableManagers.map((m: any) => (
                <option key={m.id} value={m.staffId}>
                  {m.staffId} - {m.firstName} {m.lastName} {m.position ? `(${m.position})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Direct line manager for leave approvals
            </p>
          </div>
          <div>
            <Label htmlFor="managerId">Manager (Team Assignment)</Label>
            <select
              id="managerId"
              value={formData.managerId}
              onChange={(e) => setFormData({...formData, managerId: e.target.value})}
              className="w-full px-3 py-2 border border-input rounded-md"
            >
              <option value="">Select Manager</option>
              {availableManagers.map((m: any) => (
                <option key={m.id} value={m.staffId}>
                  {m.staffId} - {m.firstName} {m.lastName} {m.position ? `(${m.position})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Manager for team/department assignment
            </p>
          </div>
        </div>
      </div>
      
      {/* MoFA Organizational Structure Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-4">MoFA Organizational Structure</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="directorate">Directorate</Label>
            <select
              id="directorate"
              value={formData.directorate}
              onChange={(e) => {
                const newDirectorate = e.target.value
                setFormData({ ...formData, directorate: newDirectorate, unit: '' })
              }}
              className="w-full px-3 py-2 border border-input rounded-md"
            >
              <option value="">Select Directorate (or leave blank for Chief Director)</option>
              {directorates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank if staff reports directly to Chief Director
            </p>
          </div>
          <div>
            <Label htmlFor="unit">Unit *</Label>
            <select
              id="unit"
              value={formData.unit}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md"
              required
            >
              <option value="">Select Unit</option>
              {availableUnits.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.directorate 
                ? `Units in ${formData.directorate}` 
                : 'Units reporting to Chief Director'}
              {formData.unit && ' - Directorate will auto-set'}
            </p>
          </div>
          <div>
            <Label htmlFor="dutyStation">Duty Station</Label>
            <select
              id="dutyStation"
              value={formData.dutyStation}
              onChange={(e) => setFormData({...formData, dutyStation: e.target.value})}
              className="w-full px-3 py-2 border border-input rounded-md"
              required
            >
              {dutyStations.map(ds => (
                <option key={ds} value={ds}>{ds}</option>
              ))}
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
