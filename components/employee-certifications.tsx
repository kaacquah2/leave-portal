'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Award, Calendar, Building2, FileText, Trash2, Edit } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Certification {
  id: string
  name: string
  issuingOrganization: string
  issueDate: string
  expiryDate?: string
  certificateNumber?: string
  certificateUrl?: string
  description?: string
  uploadedAt: string
}

export default function EmployeeCertifications() {
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCert, setEditingCert] = useState<Certification | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expiryDate: '',
    certificateNumber: '',
    description: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchCertifications()
  }, [])

  const fetchCertifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employee/certifications', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCertifications(data)
      }
    } catch (error) {
      console.error('Error fetching certifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/employee/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          id: editingCert?.id,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingCert ? 'Certification updated successfully' : 'Certification added successfully',
        })
        setDialogOpen(false)
        resetForm()
        fetchCertifications()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save certification')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save certification',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (certId: string) => {
    if (!confirm('Are you sure you want to delete this certification?')) return

    try {
      const response = await fetch(`/api/employee/certifications?id=${certId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Certification deleted successfully',
        })
        fetchCertifications()
      } else {
        throw new Error('Failed to delete certification')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete certification',
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      issuingOrganization: '',
      issueDate: '',
      expiryDate: '',
      certificateNumber: '',
      description: '',
    })
    setEditingCert(null)
  }

  const openEditDialog = (cert: Certification) => {
    setEditingCert(cert)
    setFormData({
      name: cert.name,
      issuingOrganization: cert.issuingOrganization,
      issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : '',
      expiryDate: cert.expiryDate ? new Date(cert.expiryDate).toISOString().split('T')[0] : '',
      certificateNumber: cert.certificateNumber || '',
      description: cert.description || '',
    })
    setDialogOpen(true)
  }

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
  }

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading certifications...</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Certifications</h1>
          <p className="text-muted-foreground mt-1">Track your professional certifications and credentials</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Certification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCert ? 'Edit Certification' : 'Add Certification'}</DialogTitle>
              <DialogDescription>
                Add or update your professional certification
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Certification Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., PMP, AWS Certified"
                  />
                </div>
                <div>
                  <Label htmlFor="issuingOrganization">Issuing Organization *</Label>
                  <Input
                    id="issuingOrganization"
                    value={formData.issuingOrganization}
                    onChange={(e) => setFormData({ ...formData, issuingOrganization: e.target.value })}
                    required
                    placeholder="e.g., PMI, AWS"
                  />
                </div>
                <div>
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="certificateNumber">Certificate Number</Label>
                  <Input
                    id="certificateNumber"
                    value={formData.certificateNumber}
                    onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                    placeholder="Certificate number or ID"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about the certification"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Certification</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {certifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No certifications added yet.</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Certification
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certifications.map((cert) => (
            <Card
              key={cert.id}
              className={`border-2 ${
                isExpired(cert.expiryDate)
                  ? 'border-red-200'
                  : isExpiringSoon(cert.expiryDate)
                  ? 'border-amber-200'
                  : 'border-blue-200'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    <CardTitle>{cert.name}</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(cert)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(cert.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {cert.issuingOrganization}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {cert.certificateNumber && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Certificate #: </span>
                    <span className="font-mono">{cert.certificateNumber}</span>
                  </div>
                )}
                {cert.issueDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Issued: {new Date(cert.issueDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {cert.expiryDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                    </span>
                    {isExpired(cert.expiryDate) && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                    {isExpiringSoon(cert.expiryDate) && !isExpired(cert.expiryDate) && (
                      <Badge variant="secondary">Expiring Soon</Badge>
                    )}
                  </div>
                )}
                {cert.description && (
                  <p className="text-sm text-muted-foreground">{cert.description}</p>
                )}
                {cert.certificateUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(cert.certificateUrl, '_blank')}
                    className="w-full mt-2"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Certificate
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

