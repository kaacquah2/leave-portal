'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit2, Trash2, Briefcase, Users, Calendar, Search } from 'lucide-react'
import { format } from 'date-fns'

interface JobPosting {
  id: string
  title: string
  department: string
  position: string
  description: string
  requirements: string
  status: string
  postedDate: string
  closingDate?: string
  _count?: {
    candidates: number
  }
}

interface Candidate {
  id: string
  jobPostingId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: string
  appliedDate: string
  jobPosting?: {
    id: string
    title: string
    department: string
    position: string
  }
}

interface RecruitmentManagementProps {
  userRole: string
}

export default function RecruitmentManagement({ userRole }: RecruitmentManagementProps) {
  const [activeTab, setActiveTab] = useState('jobs')
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [showJobForm, setShowJobForm] = useState(false)
  const [showCandidateForm, setShowCandidateForm] = useState(false)
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const { toast } = useToast()

  const [jobFormData, setJobFormData] = useState({
    title: '',
    department: '',
    position: '',
    description: '',
    requirements: '',
    status: 'draft',
    closingDate: '',
  })

  const [candidateFormData, setCandidateFormData] = useState({
    jobPostingId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    resumeUrl: '',
    coverLetter: '',
  })

  const isHR = userRole.includes('HR') || userRole === 'admin' || userRole === 'SYS_ADMIN'

  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchJobs()
    } else if (activeTab === 'candidates') {
      fetchCandidates()
    }
  }, [activeTab])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/recruitment/jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const params = selectedJobId ? `?jobPostingId=${selectedJobId}` : ''
      const response = await apiRequest(`/api/recruitment/candidates${params}`)
      if (response.ok) {
        const data = await response.json()
        setCandidates(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const url = editingJob ? `/api/recruitment/jobs/${editingJob.id}` : '/api/recruitment/jobs'
      const method = editingJob ? 'PATCH' : 'POST'

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(jobFormData),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingJob
            ? 'Job posting updated successfully'
            : 'Job posting created successfully',
        })
        setShowJobForm(false)
        setEditingJob(null)
        resetJobForm()
        fetchJobs()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save job posting',
        variant: 'destructive',
      })
    }
  }

  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/recruitment/candidates', {
        method: 'POST',
        body: JSON.stringify(candidateFormData),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Application submitted successfully',
        })
        setShowCandidateForm(false)
        resetCandidateForm()
        fetchCandidates()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return

    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest(`/api/recruitment/jobs/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Job posting deleted successfully',
        })
        fetchJobs()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete job posting',
        variant: 'destructive',
      })
    }
  }

  const resetJobForm = () => {
    setJobFormData({
      title: '',
      department: '',
      position: '',
      description: '',
      requirements: '',
      status: 'draft',
      closingDate: '',
    })
  }

  const resetCandidateForm = () => {
    setCandidateFormData({
      jobPostingId: selectedJobId || '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      resumeUrl: '',
      coverLetter: '',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'default'
      case 'draft':
        return 'secondary'
      case 'closed':
        return 'outline'
      case 'filled':
        return 'default'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Recruitment Management</CardTitle>
          <CardDescription>Manage job postings and candidate applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="jobs">
                <Briefcase className="w-4 h-4 mr-2" />
                Job Postings
              </TabsTrigger>
              <TabsTrigger value="candidates">
                <Users className="w-4 h-4 mr-2" />
                Candidates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-4 mt-4">
              <div className="flex justify-end">
                {isHR && (
                  <Button onClick={() => {
                    resetJobForm()
                    setEditingJob(null)
                    setShowJobForm(true)
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Job Posting
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No job postings found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Posted Date</TableHead>
                        <TableHead>Candidates</TableHead>
                        {isHR && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.title}</TableCell>
                          <TableCell>{job.department}</TableCell>
                          <TableCell>{job.position}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(job.status)}>
                              {job.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(job.postedDate), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{job._count?.candidates || 0}</TableCell>
                          {isHR && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingJob(job)
                                    setJobFormData({
                                      title: job.title,
                                      department: job.department,
                                      position: job.position,
                                      description: job.description,
                                      requirements: job.requirements,
                                      status: job.status,
                                      closingDate: job.closingDate
                                        ? job.closingDate.split('T')[0]
                                        : '',
                                    })
                                    setShowJobForm(true)
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteJob(job.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="candidates" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <Select
                  value={selectedJobId || 'all'}
                  onValueChange={(value) => {
                    setSelectedJobId(value === 'all' ? null : value)
                    if (value !== 'all') {
                      fetchCandidates()
                    }
                  }}
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Filter by job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => {
                  resetCandidateForm()
                  setShowCandidateForm(true)
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Application
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : candidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No candidates found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Applied Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map((candidate) => (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium">
                            {candidate.firstName} {candidate.lastName}
                          </TableCell>
                          <TableCell>{candidate.email}</TableCell>
                          <TableCell>{candidate.phone}</TableCell>
                          <TableCell>
                            {candidate.jobPosting?.title || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{candidate.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(candidate.appliedDate), 'MMM dd, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Job Form Dialog */}
      <Dialog open={showJobForm} onOpenChange={setShowJobForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingJob ? 'Edit Job Posting' : 'New Job Posting'}
            </DialogTitle>
            <DialogDescription>
              {editingJob
                ? 'Update the job posting details'
                : 'Create a new job posting'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleJobSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={jobFormData.title}
                  onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={jobFormData.department}
                  onChange={(e) => setJobFormData({ ...jobFormData, department: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                value={jobFormData.position}
                onChange={(e) => setJobFormData({ ...jobFormData, position: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={jobFormData.description}
                onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="requirements">Requirements *</Label>
              <Textarea
                id="requirements"
                value={jobFormData.requirements}
                onChange={(e) => setJobFormData({ ...jobFormData, requirements: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={jobFormData.status}
                  onValueChange={(value) => setJobFormData({ ...jobFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="closingDate">Closing Date</Label>
                <Input
                  id="closingDate"
                  type="date"
                  value={jobFormData.closingDate}
                  onChange={(e) => setJobFormData({ ...jobFormData, closingDate: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowJobForm(false)
                setEditingJob(null)
                resetJobForm()
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingJob ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Candidate Form Dialog */}
      <Dialog open={showCandidateForm} onOpenChange={setShowCandidateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Application</DialogTitle>
            <DialogDescription>
              Submit a new job application
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCandidateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="jobPostingId">Job Posting *</Label>
              <Select
                value={candidateFormData.jobPostingId}
                onValueChange={(value) => setCandidateFormData({ ...candidateFormData, jobPostingId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.filter(j => j.status === 'published').map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} - {job.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={candidateFormData.firstName}
                  onChange={(e) => setCandidateFormData({ ...candidateFormData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={candidateFormData.lastName}
                  onChange={(e) => setCandidateFormData({ ...candidateFormData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={candidateFormData.email}
                  onChange={(e) => setCandidateFormData({ ...candidateFormData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={candidateFormData.phone}
                  onChange={(e) => setCandidateFormData({ ...candidateFormData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="resumeUrl">Resume URL</Label>
              <Input
                id="resumeUrl"
                value={candidateFormData.resumeUrl}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, resumeUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="coverLetter">Cover Letter</Label>
              <Textarea
                id="coverLetter"
                value={candidateFormData.coverLetter}
                onChange={(e) => setCandidateFormData({ ...candidateFormData, coverLetter: e.target.value })}
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowCandidateForm(false)
                resetCandidateForm()
              }}>
                Cancel
              </Button>
              <Button type="submit">Submit Application</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

