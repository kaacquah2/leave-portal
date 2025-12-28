'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { FileText, Save, Edit } from 'lucide-react'

interface TaxInfo {
  tin: string
  ssnitNumber?: string
  taxRelief: number
  dependents: number
  additionalInfo?: string
  updatedAt?: string
}

export default function EmployeeTaxInfo() {
  const [taxInfo, setTaxInfo] = useState<TaxInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<TaxInfo>({
    tin: '',
    ssnitNumber: '',
    taxRelief: 0,
    dependents: 0,
    additionalInfo: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchTaxInfo()
  }, [])

  const fetchTaxInfo = async () => {
    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/employee/tax-info')
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setTaxInfo(data)
          setFormData(data)
        }
      }
    } catch (error) {
      console.error('Error fetching tax info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/employee/tax-info', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const result = await response.json()
        setTaxInfo(result.taxInfo)
        setIsEditing(false)
        toast({
          title: 'Success',
          description: 'Tax information updated successfully',
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save tax information')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save tax information',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading tax information...</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Information</h1>
          <p className="text-muted-foreground mt-1">Manage your tax details for payroll processing</p>
        </div>
        {!isEditing && taxInfo && (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        )}
      </div>

      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Details
          </CardTitle>
          <CardDescription>
            {isEditing
              ? 'Update your tax information'
              : 'Your tax information for payroll deductions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing || !taxInfo ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tin">Tax Identification Number (TIN) *</Label>
                  <Input
                    id="tin"
                    value={formData.tin}
                    onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                    required
                    placeholder="Enter TIN"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your unique tax identification number
                  </p>
                </div>
                <div>
                  <Label htmlFor="ssnitNumber">SSNIT Number</Label>
                  <Input
                    id="ssnitNumber"
                    value={formData.ssnitNumber}
                    onChange={(e) => setFormData({ ...formData, ssnitNumber: e.target.value })}
                    placeholder="Enter SSNIT number"
                  />
                </div>
                <div>
                  <Label htmlFor="taxRelief">Tax Relief (GHS)</Label>
                  <Input
                    id="taxRelief"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.taxRelief}
                    onChange={(e) => setFormData({ ...formData, taxRelief: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="dependents">Number of Dependents</Label>
                  <Input
                    id="dependents"
                    type="number"
                    min="0"
                    value={formData.dependents}
                    onChange={(e) => setFormData({ ...formData, dependents: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Input
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                  placeholder="Any additional tax-related information"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
                {taxInfo && (
                  <Button type="button" variant="outline" onClick={() => {
                    setIsEditing(false)
                    setFormData(taxInfo)
                  }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tax Identification Number (TIN)</Label>
                  <p className="font-medium font-mono">{taxInfo.tin}</p>
                </div>
                {taxInfo.ssnitNumber && (
                  <div>
                    <Label className="text-muted-foreground">SSNIT Number</Label>
                    <p className="font-medium font-mono">{taxInfo.ssnitNumber}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Tax Relief</Label>
                  <p className="font-medium">GHS {taxInfo.taxRelief.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Dependents</Label>
                  <p className="font-medium">{taxInfo.dependents}</p>
                </div>
                {taxInfo.additionalInfo && (
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">Additional Information</Label>
                    <p className="font-medium">{taxInfo.additionalInfo}</p>
                  </div>
                )}
              </div>
              {taxInfo.updatedAt && (
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(taxInfo.updatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

