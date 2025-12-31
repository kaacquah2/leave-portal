'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  GraduationCap, 
  Plus, 
  Edit, 
  RefreshCw,
  Search,
  CheckCircle2,
  Users,
  Calendar,
  Award
} from 'lucide-react'
import { apiRequest } from '@/lib/api-config'
import { toast } from 'sonner'

interface TrainingProgram {
  id: string
  title: string
  description: string
  provider: string
  type: string
  category?: string
  startDate: string
  endDate: string
  location?: string
  capacity?: number
  duration?: number
  cost?: number
  status: string
  createdAt: string
}

interface TrainingCertificate {
  id: string
  staffId: string
  trainingProgramId?: string
  certificateNumber: string
  certificateName: string
  issuingOrganization: string
  issueDate: string
  expiryDate?: string
  verified: boolean
  verifiedBy?: string
  verifiedAt?: string
}

export default function TrainingManagement() {
  const [activeTab, setActiveTab] = useState('programs')
  const [programs, setPrograms] = useState<TrainingProgram[]>([])
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    provider: '',
    type: 'internal',
    category: '',
    startDate: '',
    endDate: '',
    location: '',
    capacity: '',
    duration: '',
    cost: '',
  })

  const programTypes = ['internal', 'external', 'online']
  const programStatuses = ['scheduled', 'ongoing', 'completed', 'cancelled']

  const fetchPrograms = async () => {
    try {
      const response = await apiRequest('/api/training/programs')
      if (response.ok) {
        const data = await response.json()
        setPrograms(data.programs || data || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch programs:', err)
    }
  }

  const fetchCertificates = async () => {
    try {
      const response = await apiRequest('/api/training/certificates')
      if (response.ok) {
        const data = await response.json()
        setCertificates(data.certificates || data || [])
      }
    } catch (err: any) {
      console.error('Failed to fetch certificates:', err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([fetchPrograms(), fetchCertificates()])
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleOpenDialog = (program?: TrainingProgram) => {
    if (program) {
      setEditingProgram(program)
      setFormData({
        title: program.title,
        description: program.description,
        provider: program.provider,
        type: program.type,
        category: program.category || '',
        startDate: program.startDate.split('T')[0],
        endDate: program.endDate.split('T')[0],
        location: program.location || '',
        capacity: program.capacity?.toString() || '',
        duration: program.duration?.toString() || '',
        cost: program.cost?.toString() || '',
      })
    } else {
      setEditingProgram(null)
      setFormData({
        title: '',
        description: '',
        provider: '',
        type: 'internal',
        category: '',
        startDate: '',
        endDate: '',
        location: '',
        capacity: '',
        duration: '',
        cost: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingProgram(null)
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        provider: formData.provider,
        type: formData.type,
        category: formData.category || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        location: formData.location || undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
      }

      if (editingProgram) {
        const response = await apiRequest(`/api/training/programs/${editingProgram.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('Failed to update program')
        }

        toast.success('Training program updated successfully')
      } else {
        const response = await apiRequest('/api/training/programs', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('Failed to create program')
        }

        toast.success('Training program created successfully')
      }

      handleCloseDialog()
      fetchPrograms()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save program')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800"><Calendar className="w-3 h-3 mr-1" />Scheduled</Badge>
      case 'ongoing':
        return <Badge className="bg-green-100 text-green-800"><Users className="w-3 h-3 mr-1" />Ongoing</Badge>
      case 'completed':
        return <Badge className="bg-purple-100 text-purple-800"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const filteredPrograms = programs.filter((program) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      program.title.toLowerCase().includes(search) ||
      program.description.toLowerCase().includes(search) ||
      program.provider.toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading training data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            Training & Development
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage training programs and certificates (PSC compliant)
          </p>
        </div>
        <Button variant="outline" onClick={() => {
          fetchPrograms()
          fetchCertificates()
        }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="programs">Training Programs</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Training Programs</CardTitle>
                  <CardDescription>
                    Manage training programs and attendance
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Program
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search programs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredPrograms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No training programs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPrograms.map((program) => (
                    <div key={program.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{program.title}</h3>
                            {getStatusBadge(program.status)}
                            <Badge variant="outline">{program.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{program.description}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Provider:</span>
                              <div className="font-semibold">{program.provider}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration:</span>
                              <div className="font-semibold">
                                {program.duration ? `${program.duration} hours` : '-'}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Start Date:</span>
                              <div className="font-semibold">
                                {new Date(program.startDate).toLocaleDateString()}
                              </div>
                            </div>
                            {program.capacity && (
                              <div>
                                <span className="text-muted-foreground">Capacity:</span>
                                <div className="font-semibold">{program.capacity} participants</div>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(program)}
                          className="ml-4"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Certificates</CardTitle>
              <CardDescription>
                View and manage training certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No certificates found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold">{cert.certificateName}</h3>
                            {cert.verified ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Unverified</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Staff ID:</span>
                              <div className="font-semibold">{cert.staffId}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Issued By:</span>
                              <div className="font-semibold">{cert.issuingOrganization}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Issue Date:</span>
                              <div className="font-semibold">
                                {new Date(cert.issueDate).toLocaleDateString()}
                              </div>
                            </div>
                            {cert.expiryDate && (
                              <div>
                                <span className="text-muted-foreground">Expiry Date:</span>
                                <div className="font-semibold">
                                  {new Date(cert.expiryDate).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? 'Edit Training Program' : 'Create New Training Program'}
            </DialogTitle>
            <DialogDescription>
              Configure training program details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Program Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provider">Provider *</Label>
                <Input
                  id="provider"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {programTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cost">Cost (₵)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingProgram ? 'Update' : 'Create'} Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

