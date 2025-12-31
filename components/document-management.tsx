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
import { Plus, Upload, Download, Trash2, Edit2, FileText, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'

interface Document {
  id: string
  staffId?: string
  name: string
  type: string
  category: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: string
  description?: string
  isPublic: boolean
  tags: string[]
  status: string
  staff?: {
    staffId: string
    firstName: string
    lastName: string
    email: string
    department: string
  }
}

interface DocumentManagementProps {
  userRole: string
  staffId?: string
}

export default function DocumentManagement({ userRole, staffId }: DocumentManagementProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: '',
    description: '',
    isPublic: false,
    tags: '',
  })

  const isHR = userRole.includes('HR') || userRole === 'admin' || userRole === 'SYS_ADMIN'

  useEffect(() => {
    fetchDocuments()
  }, [typeFilter, categoryFilter, statusFilter, staffId])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const params = new URLSearchParams()
      if (staffId) params.append('staffId', staffId)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await apiRequest(`/api/documents?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      })
      return
    }

    try {
      const { apiRequest, API_BASE_URL } = await import('@/lib/api-config')
      const uploadFormData = new FormData()
      uploadFormData.append('file', uploadFile)
      uploadFormData.append('type', formData.type)
      uploadFormData.append('category', formData.category)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('isPublic', formData.isPublic.toString())
      if (staffId) uploadFormData.append('staffId', staffId)

      const uploadUrl = API_BASE_URL
        ? `${API_BASE_URL}/api/documents/upload`
        : '/api/documents/upload'

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      })

      if (uploadResponse.ok) {
        toast({
          title: 'Success',
          description: 'Document uploaded successfully',
        })
        setShowUploadForm(false)
        resetForm()
        setUploadFile(null)
        fetchDocuments()
      } else {
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Failed to upload')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      })
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDocument) return

    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest(`/api/documents/${editingDocument.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Document updated successfully',
        })
        setShowEditForm(false)
        setEditingDocument(null)
        resetForm()
        fetchDocuments()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update document',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest(`/api/documents/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Document deleted successfully',
        })
        fetchDocuments()
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (document: Document) => {
    setEditingDocument(document)
    setFormData({
      name: document.name,
      type: document.type,
      category: document.category,
      description: document.description || '',
      isPublic: document.isPublic,
      tags: document.tags.join(', '),
    })
    setShowEditForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      category: '',
      description: '',
      isPublic: false,
      tags: '',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.staff?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.staff?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document Management</CardTitle>
              <CardDescription>
                Manage and organize documents
              </CardDescription>
            </div>
            <Button onClick={() => {
              resetForm()
              setShowUploadForm(true)
            }}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="promotion">Promotion</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No documents found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    {isHR && <TableHead>Staff</TableHead>}
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{doc.name}</div>
                            {doc.description && (
                              <div className="text-sm text-muted-foreground">
                                {doc.description.substring(0, 50)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.type}</Badge>
                      </TableCell>
                      <TableCell>{doc.category}</TableCell>
                      {isHR && (
                        <TableCell>
                          {doc.staff ? (
                            <div>
                              <div className="font-medium">
                                {doc.staff.firstName} {doc.staff.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {doc.staff.staffId}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Public</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        {format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.status === 'active' ? 'default' : 'secondary'}>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(doc)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadForm} onOpenChange={setShowUploadForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a new document to the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label htmlFor="file">File *</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Employment, Training"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isPublic">Make this document public</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowUploadForm(false)
                resetForm()
                setUploadFile(null)
              }}>
                Cancel
              </Button>
              <Button type="submit">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update document information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-category">Category *</Label>
                <Input
                  id="edit-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., important, contract, 2024"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-isPublic">Make this document public</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowEditForm(false)
                setEditingDocument(null)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

