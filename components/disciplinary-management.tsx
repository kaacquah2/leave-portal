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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit2, Trash2, AlertTriangle, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'

interface DisciplinaryAction {
  id: string
  staffId: string
  actionType: string
  severity: string
  title: string
  description: string
  incidentDate: string
  issuedBy: string
  issuedDate: string
  documentUrl?: string
  status: string
  resolvedDate?: string
  resolvedBy?: string
  staff?: {
    staffId: string
    firstName: string
    lastName: string
    email: string
    department: string
    position: string
  }
}

interface DisciplinaryManagementProps {
  userRole: string
  staffId?: string
}

export default function DisciplinaryManagement({ userRole, staffId }: DisciplinaryManagementProps) {
  const [actions, setActions] = useState<DisciplinaryAction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAction, setEditingAction] = useState<DisciplinaryAction | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [staffList, setStaffList] = useState<any[]>([])
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    staffId: '',
    actionType: '',
    severity: '',
    title: '',
    description: '',
    incidentDate: '',
    documentUrl: '',
  })

  const isHR = userRole.includes('HR') || userRole === 'admin' || userRole === 'SYS_ADMIN'

  useEffect(() => {
    fetchActions()
    if (isHR) {
      fetchStaff()
    }
  }, [statusFilter, typeFilter, staffId])

  const fetchStaff = async () => {
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/staff')
      if (response.ok) {
        const data = await response.json()
        setStaffList(data)
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchActions = async () => {
    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const params = new URLSearchParams()
      if (staffId) params.append('staffId', staffId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('actionType', typeFilter)

      const response = await apiRequest(`/api/disciplinary?${params}`)
      if (response.ok) {
        const data = await response.json()
        setActions(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching disciplinary actions:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch disciplinary actions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const url = editingAction ? `/api/disciplinary/${editingAction.id}` : '/api/disciplinary'
      const method = editingAction ? 'PATCH' : 'POST'

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingAction
            ? 'Disciplinary action updated successfully'
            : 'Disciplinary action created successfully',
        })
        setShowForm(false)
        setEditingAction(null)
        resetForm()
        fetchActions()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save disciplinary action',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this disciplinary action?')) return

    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest(`/api/disciplinary/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Disciplinary action deleted successfully',
        })
        fetchActions()
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete disciplinary action',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (action: DisciplinaryAction) => {
    setEditingAction(action)
    setFormData({
      staffId: action.staffId,
      actionType: action.actionType,
      severity: action.severity,
      title: action.title,
      description: action.description,
      incidentDate: action.incidentDate.split('T')[0],
      documentUrl: action.documentUrl || '',
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      staffId: staffId || '',
      actionType: '',
      severity: '',
      title: '',
      description: '',
      incidentDate: '',
      documentUrl: '',
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'destructive'
      case 'resolved':
        return 'default'
      case 'expired':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const filteredActions = actions.filter((action) => {
    const matchesSearch =
      action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.staff?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.staff?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.staffId.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Disciplinary Actions</CardTitle>
              <CardDescription>
                Manage disciplinary actions and warnings
              </CardDescription>
            </div>
            {isHR && (
              <Button onClick={() => {
                resetForm()
                setEditingAction(null)
                setShowForm(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                New Action
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, title, or staff ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="verbal_warning">Verbal Warning</SelectItem>
                <SelectItem value="written_warning">Written Warning</SelectItem>
                <SelectItem value="suspension">Suspension</SelectItem>
                <SelectItem value="termination">Termination</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No disciplinary actions found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Incident Date</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Status</TableHead>
                    {isHR && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {action.staff?.firstName} {action.staff?.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {action.staffId} - {action.staff?.department}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{action.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {action.actionType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(action.severity)}>
                          {action.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(action.incidentDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(action.issuedDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(action.status)}>
                          {action.status}
                        </Badge>
                      </TableCell>
                      {isHR && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(action)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(action.id)}
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
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAction ? 'Edit Disciplinary Action' : 'New Disciplinary Action'}
            </DialogTitle>
            <DialogDescription>
              {editingAction
                ? 'Update the disciplinary action details'
                : 'Create a new disciplinary action record'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isHR && (
              <div>
                <Label htmlFor="staffId">Staff Member *</Label>
                <Select
                  value={formData.staffId}
                  onValueChange={(value) => setFormData({ ...formData, staffId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((staff) => (
                      <SelectItem key={staff.staffId} value={staff.staffId}>
                        {staff.staffId} - {staff.firstName} {staff.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="actionType">Action Type *</Label>
                <Select
                  value={formData.actionType}
                  onValueChange={(value) => setFormData({ ...formData, actionType: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verbal_warning">Verbal Warning</SelectItem>
                    <SelectItem value="written_warning">Written Warning</SelectItem>
                    <SelectItem value="suspension">Suspension</SelectItem>
                    <SelectItem value="termination">Termination</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="incidentDate">Incident Date *</Label>
              <Input
                id="incidentDate"
                type="date"
                value={formData.incidentDate}
                onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="documentUrl">Document URL (Optional)</Label>
              <Input
                id="documentUrl"
                value={formData.documentUrl}
                onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowForm(false)
                setEditingAction(null)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingAction ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

