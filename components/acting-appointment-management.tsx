'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'

interface ActingAppointment {
  id: string
  role: string
  staffId: string
  staffName: string
  effectiveDate: string
  endDate: string
  authoritySource: string
}

export default function ActingAppointmentManagement() {
  const [appointments, setAppointments] = useState<ActingAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [formData, setFormData] = useState({
    role: '',
    staffId: '',
    effectiveDate: '',
    endDate: '',
    authoritySource: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      const response = await fetch('/api/acting-appointments')
      if (response.ok) {
        const data = await response.json()
        setAppointments(data)
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/acting-appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Acting appointment created successfully',
        })
        setShowDialog(false)
        setFormData({
          role: '',
          staffId: '',
          effectiveDate: '',
          endDate: '',
          authoritySource: '',
        })
        loadAppointments()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to create acting appointment',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create acting appointment',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this acting appointment?')) {
      return
    }

    try {
      const response = await fetch(`/api/acting-appointments/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Acting appointment deleted successfully',
        })
        loadAppointments()
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete acting appointment',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete acting appointment',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Acting Appointments</h2>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Acting Appointment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Acting Appointment</DialogTitle>
              <DialogDescription>
                Create a formal acting appointment for PSC compliance
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                    <SelectItem value="UNIT_HEAD">Unit Head</SelectItem>
                    <SelectItem value="DIVISION_HEAD">Division Head</SelectItem>
                    <SelectItem value="DIRECTOR">Director</SelectItem>
                    <SelectItem value="REGIONAL_MANAGER">Regional Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Staff ID</Label>
                <Input
                  value={formData.staffId}
                  onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  placeholder="MOFA-001234"
                  required
                />
              </div>
              <div>
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Authority Source (Appointment Letter Reference)</Label>
                <Textarea
                  value={formData.authoritySource}
                  onChange={(e) => setFormData({ ...formData, authoritySource: e.target.value })}
                  placeholder="PSC Appointment Letter No. XXX/2024"
                  required
                />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {appointments.map((appointment) => (
          <Card key={appointment.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{appointment.role}</CardTitle>
                  <CardDescription>{appointment.staffName} ({appointment.staffId})</CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(appointment.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Effective:</strong> {new Date(appointment.effectiveDate).toLocaleDateString()}
                </div>
                <div>
                  <strong>End:</strong> {new Date(appointment.endDate).toLocaleDateString()}
                </div>
                <div>
                  <strong>Authority:</strong> {appointment.authoritySource}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

