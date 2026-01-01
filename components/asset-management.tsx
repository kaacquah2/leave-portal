'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Package, 
  Plus, 
  Edit, 
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { apiRequest } from '@/lib/api-config'
import { toast } from 'sonner'

interface Asset {
  id: string
  assetNumber: string
  assetName: string
  assetType: string
  serialNumber?: string
  assignedTo?: string
  assignedDate?: string
  returnedDate?: string
  status: string
  condition?: string
  notes?: string
  createdAt: string
}

export default function AssetManagement() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [formData, setFormData] = useState({
    assetNumber: '',
    assetName: '',
    assetType: '',
    serialNumber: '',
    condition: 'good',
    notes: '',
  })

  const assetTypes = ['laptop', 'phone', 'vehicle', 'furniture', 'other']
  const assetStatuses = ['available', 'assigned', 'returned', 'damaged', 'lost']
  const assetConditions = ['new', 'good', 'fair', 'poor']

  const fetchAssets = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter)

      const response = await apiRequest(`/api/assets?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }

      const data = await response.json()
      setAssets(data.assets || data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load assets')
      toast.error('Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [statusFilter, typeFilter])

  const handleOpenDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset)
      setFormData({
        assetNumber: asset.assetNumber,
        assetName: asset.assetName,
        assetType: asset.assetType,
        serialNumber: asset.serialNumber || '',
        condition: asset.condition || 'good',
        notes: asset.notes || '',
      })
    } else {
      setEditingAsset(null)
      setFormData({
        assetNumber: '',
        assetName: '',
        assetType: '',
        serialNumber: '',
        condition: 'good',
        notes: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingAsset(null)
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        assetNumber: formData.assetNumber,
        assetName: formData.assetName,
        assetType: formData.assetType,
        serialNumber: formData.serialNumber || undefined,
        condition: formData.condition,
        notes: formData.notes || undefined,
      }

      if (editingAsset) {
        const response = await apiRequest(`/api/assets/${editingAsset.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('Failed to update asset')
        }

        toast.success('Asset updated successfully')
      } else {
        const response = await apiRequest('/api/assets', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error('Failed to create asset')
        }

        toast.success('Asset created successfully')
      }

      handleCloseDialog()
      fetchAssets()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save asset')
    }
  }

  const handleAssign = async (assetId: string, staffId: string) => {
    try {
      const response = await apiRequest(`/api/assets/${assetId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ staffId }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign asset')
      }

      toast.success('Asset assigned successfully')
      fetchAssets()
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign asset')
    }
  }

  const handleReturn = async (assetId: string) => {
    try {
      const response = await apiRequest(`/api/assets/${assetId}/return`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to return asset')
      }

      toast.success('Asset returned successfully')
      fetchAssets()
    } catch (err: any) {
      toast.error(err.message || 'Failed to return asset')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>
      case 'assigned':
        return <Badge className="bg-blue-100 text-blue-800">Assigned</Badge>
      case 'returned':
        return <Badge className="bg-gray-100 text-gray-800">Returned</Badge>
      case 'damaged':
        return <Badge className="bg-red-100 text-red-800">Damaged</Badge>
      case 'lost':
        return <Badge className="bg-red-100 text-red-800">Lost</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const filteredAssets = assets.filter((asset) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      asset.assetNumber.toLowerCase().includes(search) ||
      asset.assetName.toLowerCase().includes(search) ||
      (asset.serialNumber && asset.serialNumber.toLowerCase().includes(search)) ||
      (asset.assignedTo && asset.assignedTo.toLowerCase().includes(search))
    )
  })

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading assets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-8 h-8 text-primary" />
            Asset Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage government assets (IAA compliant)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAssets}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            New Asset
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {assetStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {assetTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>
            {filteredAssets.length} asset(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No assets found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssets.map((asset) => (
                <div key={asset.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{asset.assetName}</h3>
                        {getStatusBadge(asset.status)}
                        <Badge variant="outline">{asset.assetType}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Asset Number:</span>
                          <div className="font-semibold">{asset.assetNumber}</div>
                        </div>
                        {asset.serialNumber && (
                          <div>
                            <span className="text-muted-foreground">Serial Number:</span>
                            <div className="font-semibold">{asset.serialNumber}</div>
                          </div>
                        )}
                        {asset.assignedTo && (
                          <div>
                            <span className="text-muted-foreground">Assigned To:</span>
                            <div className="font-semibold">{asset.assignedTo}</div>
                          </div>
                        )}
                        {asset.condition && (
                          <div>
                            <span className="text-muted-foreground">Condition:</span>
                            <div className="font-semibold capitalize">{asset.condition}</div>
                          </div>
                        )}
                      </div>
                      {asset.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{asset.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(asset)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {asset.status === 'assigned' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReturn(asset.id)}
                        >
                          Return
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? 'Edit Asset' : 'Create New Asset'}
            </DialogTitle>
            <DialogDescription>
              Manage asset information for tracking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="assetNumber">Asset Number *</Label>
              <Input
                id="assetNumber"
                value={formData.assetNumber}
                onChange={(e) => setFormData({ ...formData, assetNumber: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="assetName">Asset Name *</Label>
              <Input
                id="assetName"
                value={formData.assetName}
                onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="assetType">Asset Type *</Label>
              <Select
                value={formData.assetType}
                onValueChange={(value) => setFormData({ ...formData, assetType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetConditions.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {condition.charAt(0).toUpperCase() + condition.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingAsset ? 'Update' : 'Create'} Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

