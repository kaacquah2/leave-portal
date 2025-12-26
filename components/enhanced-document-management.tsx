'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  Upload, 
  FileText, 
  Tag, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Archive,
  Trash2,
  History,
  FileCheck,
  Filter,
  Download,
  MoreVertical,
  Plus
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'

interface Document {
  id: string
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
  expiresAt?: string
  version: number
  parentId?: string
  tags: string[]
  status: string
  signedBy?: string
  signedAt?: string
  signatureHash?: string
  staffId?: string
  staff?: {
    firstName: string
    lastName: string
    email: string
  }
}

interface DocumentTemplate {
  id: string
  name: string
  description?: string
  category: string
  type: string
  fileUrl?: string
  fields?: any
  isActive: boolean
}

export default function EnhancedDocumentManagement({ userRole }: { userRole: string }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('active')
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [showExpired, setShowExpired] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [showVersionDialog, setShowVersionDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [versions, setVersions] = useState<Document[]>([])
  const { toast } = useToast()

  const canEdit = userRole === 'hr' || userRole === 'admin'
  const canBulkOperate = canEdit

  useEffect(() => {
    fetchDocuments()
    if (canEdit) {
      fetchTemplates()
    }
  }, [selectedCategory, selectedType, selectedStatus, selectedTag, showExpired, searchTerm, canEdit])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedType !== 'all') params.append('type', selectedType)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      if (selectedTag) params.append('tag', selectedTag)
      if (showExpired) params.append('expired', 'true')
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/documents?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json()
      setDocuments(data)
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/documents/templates', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const fetchVersions = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/version`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setVersions(data)
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    }
  }

  const handleBulkOperation = async (operation: string, data?: any) => {
    if (selectedDocuments.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one document',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/documents/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          operation,
          documentIds: selectedDocuments,
          data,
        }),
      })

      if (!response.ok) throw new Error('Bulk operation failed')
      const result = await response.json()

      toast({
        title: 'Success',
        description: `Operation completed: ${result.processed} documents processed`,
      })

      setSelectedDocuments([])
      setShowBulkDialog(false)
      fetchDocuments()
    } catch (error) {
      console.error('Error performing bulk operation:', error)
      toast({
        title: 'Error',
        description: 'Failed to perform bulk operation',
        variant: 'destructive',
      })
    }
  }

  const handleViewVersions = async (document: Document) => {
    setSelectedDocument(document)
    await fetchVersions(document.id)
    setShowVersionDialog(true)
  }

  const handleSignDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          signatureData: `signed-${documentId}-${Date.now()}`,
        }),
      })

      if (!response.ok) throw new Error('Failed to sign document')
      
      toast({
        title: 'Success',
        description: 'Document signed successfully',
      })
      fetchDocuments()
    } catch (error) {
      console.error('Error signing document:', error)
      toast({
        title: 'Error',
        description: 'Failed to sign document',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to delete document')
      
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      })
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      })
    }
  }

  // Get unique categories, types, and tags from documents
  const categories = Array.from(new Set(documents.map(d => d.category)))
  const types = Array.from(new Set(documents.map(d => d.type)))
  const allTags = Array.from(new Set(documents.flatMap(d => d.tags || [])))

  // Filter documents by expiration
  const expiringDocuments = documents.filter(doc => {
    if (!doc.expiresAt) return false
    const expiryDate = new Date(doc.expiresAt)
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  })

  const expiredDocuments = documents.filter(doc => {
    if (!doc.expiresAt) return false
    return new Date(doc.expiresAt) < new Date()
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-muted-foreground">
            Manage, organize, and track all staff documents
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => {/* Open upload dialog */}}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            {allTags.length > 0 && (
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={showExpired}
                onCheckedChange={(checked) => setShowExpired(checked === true)}
              />
              <span className="text-sm">Show expired documents</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {(expiringDocuments.length > 0 || expiredDocuments.length > 0) && (
        <div className="space-y-2">
          {expiringDocuments.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span className="font-medium">
                      {expiringDocuments.length} document(s) expiring within 30 days
                    </span>
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        fetch('/api/documents/expiring', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ days: 30 }),
                        }).then(() => {
                          toast({
                            title: 'Success',
                            description: 'Expiration notifications sent',
                          })
                        })
                      }}
                    >
                      Send Notifications
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {expiredDocuments.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium">
                    {expiredDocuments.length} document(s) have expired
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Bulk Operations */}
      {canBulkOperate && selectedDocuments.length > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedDocuments.length} document(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkOperation('addTags', { tags: [] })}
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Add Tags
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkOperation('archive')}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkOperation('delete')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDocuments([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            {documents.length} document(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    {canBulkOperate && (
                      <th className="text-left py-3 px-4 w-12">
                        <Checkbox
                          checked={selectedDocuments.length === documents.length && documents.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDocuments(documents.map(d => d.id))
                            } else {
                              setSelectedDocuments([])
                            }
                          }}
                        />
                      </th>
                    )}
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-left py-3 px-4">Staff</th>
                    <th className="text-left py-3 px-4">Tags</th>
                    <th className="text-left py-3 px-4">Version</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Expires</th>
                    <th className="text-left py-3 px-4">Signed</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-secondary/5">
                      {canBulkOperate && (
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={selectedDocuments.includes(doc.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDocuments([...selectedDocuments, doc.id])
                              } else {
                                setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id))
                              }
                            }}
                          />
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground mt-1">{doc.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">{doc.type}</td>
                      <td className="py-3 px-4">{doc.category}</td>
                      <td className="py-3 px-4">
                        {doc.staff 
                          ? `${doc.staff.firstName} ${doc.staff.lastName}`
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {doc.tags?.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {doc.tags && doc.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{doc.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">v{doc.version}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={
                            doc.status === 'active' ? 'default' :
                            doc.status === 'archived' ? 'secondary' :
                            doc.status === 'expired' ? 'destructive' : 'secondary'
                          }
                        >
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {doc.expiresAt ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs">
                              {new Date(doc.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No expiry</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {doc.signedAt ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs">
                              {new Date(doc.signedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not signed</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(doc.fileUrl, '_blank')}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            {doc.parentId && (
                              <DropdownMenuItem onClick={() => handleViewVersions(doc)}>
                                <History className="w-4 h-4 mr-2" />
                                View Versions
                              </DropdownMenuItem>
                            )}
                            {!doc.signedAt && (
                              <DropdownMenuItem onClick={() => handleSignDocument(doc.id)}>
                                <FileCheck className="w-4 h-4 mr-2" />
                                Sign Document
                              </DropdownMenuItem>
                            )}
                            {canEdit && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {/* Edit */}}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(doc.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version History Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Document Version History</DialogTitle>
            <DialogDescription>
              {selectedDocument?.name} - All versions
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {versions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No versions found</p>
            ) : (
              <div className="space-y-2">
                {versions.map((version) => (
                  <Card key={version.id} className={version.id === selectedDocument?.id ? 'border-primary' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge>Version {version.version}</Badge>
                            {version.id === selectedDocument?.id && (
                              <Badge variant="default">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Uploaded: {new Date(version.uploadedAt).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            By: {version.uploadedBy}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(version.fileUrl, '_blank')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowVersionDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

