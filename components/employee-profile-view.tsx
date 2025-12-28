'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FileText, Edit, Phone, Building2, FileCheck, Award, GraduationCap, Mail } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface EmployeeProfileViewProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  staffId: string
}

export default function EmployeeProfileView({ store, staffId }: EmployeeProfileViewProps) {
  const { toast } = useToast()
  const staff = store.staff.find((s: any) => s.staffId === staffId)
  const [requestChangeDialog, setRequestChangeDialog] = useState<{ open: boolean; section: string }>({ open: false, section: '' })
  const [changeRequest, setChangeRequest] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!staff) {
    return <div className="p-8">Staff member not found</div>
  }

  const handleRequestChange = async () => {
    if (!changeRequest.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide details about the requested change',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Submit change request to HR
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/employee/change-request', {
        method: 'POST',
        body: JSON.stringify({
          staffId,
          section: requestChangeDialog.section,
          requestedChanges: changeRequest,
          currentData: getSectionData(requestChangeDialog.section),
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Your change request has been submitted to HR for review',
        })
        setRequestChangeDialog({ open: false, section: '' })
        setChangeRequest('')
      } else {
        throw new Error('Failed to submit change request')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit change request. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSectionData = (section: string) => {
    switch (section) {
      case 'personal':
        return { firstName: staff.firstName, lastName: staff.lastName, email: staff.email, phone: staff.phone }
      case 'bank':
        return { /* bank account data */ }
      case 'tax':
        return { /* tax info data */ }
      default:
        return {}
    }
  }

  const SectionCard = ({ title, description, icon: Icon, section, children }: {
    title: string
    description: string
    icon: any
    section: string
    children: React.ReactNode
  }) => (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRequestChangeDialog({ open: true, section })}
          >
            <Edit className="w-4 h-4 mr-2" />
            Request Change
          </Button>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-1">View your profile information (read-only)</p>
      </div>

      {/* Personal Information */}
      <SectionCard
        title="Personal Information"
        description="Your personal details. Contact HR to request changes."
        icon={FileText}
        section="personal"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">First Name</Label>
            <p className="font-medium">{staff.firstName}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Last Name</Label>
            <p className="font-medium">{staff.lastName}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {staff.email}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Phone</Label>
            <p className="font-medium flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {staff.phone || 'Not provided'}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Employment Information */}
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
              <p className="font-medium">{staff.grade || 'Not assigned'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Rank</Label>
              <p className="font-medium">{staff.rank || 'Not assigned'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Step</Label>
              <p className="font-medium">{staff.step || 'Not assigned'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Directorate/Unit</Label>
              <p className="font-medium">{staff.directorate || staff.unit || 'Not assigned'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Join Date</Label>
              <p className="font-medium">{new Date(staff.joinDate).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <Badge variant={staff.active ? 'default' : 'secondary'}>
                {staff.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Account Information */}
      <SectionCard
        title="Bank Account Information"
        description="Your bank account details. Contact HR to request changes."
        icon={Building2}
        section="bank"
      >
        <div className="text-muted-foreground">
          <p>Bank account information is managed by HR.</p>
          <p className="text-sm mt-2">Use "Request Change" to request updates to your bank account details.</p>
        </div>
      </SectionCard>

      {/* Tax Information */}
      <SectionCard
        title="Tax Information"
        description="Your tax details. Contact HR to request changes."
        icon={FileCheck}
        section="tax"
      >
        <div className="text-muted-foreground">
          <p>Tax information is managed by HR.</p>
          <p className="text-sm mt-2">Use "Request Change" to request updates to your tax information.</p>
        </div>
      </SectionCard>

      {/* Certifications */}
      <SectionCard
        title="Certifications"
        description="Your professional certifications. Contact HR to add or update."
        icon={Award}
        section="certifications"
      >
        <div className="text-muted-foreground">
          <p>Certifications are managed by HR.</p>
          <p className="text-sm mt-2">Use "Request Change" to request updates to your certifications.</p>
        </div>
      </SectionCard>

      {/* Training Records */}
      <SectionCard
        title="Training Records"
        description="Your training history. Contact HR to add or update."
        icon={GraduationCap}
        section="training"
      >
        <div className="text-muted-foreground">
          <p>Training records are managed by HR.</p>
          <p className="text-sm mt-2">Use "Request Change" to request updates to your training records.</p>
        </div>
      </SectionCard>

      {/* Request Change Dialog */}
      <Dialog open={requestChangeDialog.open} onOpenChange={(open) => setRequestChangeDialog({ open, section: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Profile Change</DialogTitle>
            <DialogDescription>
              Submit a request to HR to update your {requestChangeDialog.section} information.
              HR will review and process your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="changeRequest">Describe the requested change</Label>
              <Textarea
                id="changeRequest"
                value={changeRequest}
                onChange={(e) => setChangeRequest(e.target.value)}
                placeholder="Please provide details about the change you would like to request..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRequestChangeDialog({ open: false, section: '' })}
              >
                Cancel
              </Button>
              <Button onClick={handleRequestChange} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

