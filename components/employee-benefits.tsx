'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Plus, CheckCircle2, Clock, XCircle, Heart, Shield, PiggyBank } from 'lucide-react'

interface Benefit {
  benefitType: string
  details: Record<string, any>
  enrolledAt?: string
  requestedAt?: string
  status: 'active' | 'pending' | 'cancelled'
}

interface BenefitsData {
  enrolled: Benefit[]
  pending: Benefit[]
  history: Benefit[]
}

const BENEFIT_TYPES = [
  { value: 'health_insurance', label: 'Health Insurance', icon: Heart },
  { value: 'life_insurance', label: 'Life Insurance', icon: Shield },
  { value: 'provident_fund', label: 'Provident Fund', icon: PiggyBank },
  { value: 'transport_allowance', label: 'Transport Allowance' },
  { value: 'housing_allowance', label: 'Housing Allowance' },
  { value: 'meal_allowance', label: 'Meal Allowance' },
]

export default function EmployeeBenefits() {
  const [benefits, setBenefits] = useState<BenefitsData>({ enrolled: [], pending: [], history: [] })
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedBenefit, setSelectedBenefit] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchBenefits()
  }, [])

  const fetchBenefits = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employee/benefits', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setBenefits(data)
      }
    } catch (error) {
      console.error('Error fetching benefits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (!selectedBenefit) {
      toast({
        title: 'Error',
        description: 'Please select a benefit',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/employee/benefits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          benefitType: selectedBenefit,
          action: 'enroll',
          details: {},
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Benefit enrollment request submitted',
        })
        setDialogOpen(false)
        setSelectedBenefit('')
        fetchBenefits()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to enroll')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enroll in benefit',
        variant: 'destructive',
      })
    }
  }

  const handleCancel = async (benefitType: string) => {
    if (!confirm('Are you sure you want to cancel this benefit?')) return

    try {
      const response = await fetch('/api/employee/benefits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          benefitType,
          action: 'cancel',
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Benefit cancelled successfully',
        })
        fetchBenefits()
      } else {
        throw new Error('Failed to cancel benefit')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel benefit',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading benefits...</div>
      </div>
    )
  }

  const getBenefitLabel = (type: string) => {
    return BENEFIT_TYPES.find((b) => b.value === type)?.label || type
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Benefits Enrollment</h1>
          <p className="text-muted-foreground mt-1">Manage your employee benefits</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Enroll in Benefit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll in Benefit</DialogTitle>
              <DialogDescription>
                Select a benefit to enroll in
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="benefit">Benefit Type</Label>
                <Select value={selectedBenefit} onValueChange={setSelectedBenefit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a benefit" />
                  </SelectTrigger>
                  <SelectContent>
                    {BENEFIT_TYPES.map((benefit) => (
                      <SelectItem key={benefit.value} value={benefit.value}>
                        {benefit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEnroll}>Enroll</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enrolled Benefits */}
      {benefits.enrolled && benefits.enrolled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Active Benefits
            </CardTitle>
            <CardDescription>Benefits you are currently enrolled in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {benefits.enrolled.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{getBenefitLabel(benefit.benefitType)}</p>
                    {benefit.enrolledAt && (
                      <p className="text-sm text-muted-foreground">
                        Enrolled: {new Date(benefit.enrolledAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Active</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(benefit.benefitType)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Benefits */}
      {benefits.pending && benefits.pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Pending Approval
            </CardTitle>
            <CardDescription>Benefits awaiting HR approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {benefits.pending.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{getBenefitLabel(benefit.benefitType)}</p>
                    {benefit.requestedAt && (
                      <p className="text-sm text-muted-foreground">
                        Requested: {new Date(benefit.requestedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Benefits */}
      {(!benefits.enrolled || benefits.enrolled.length === 0) &&
        (!benefits.pending || benefits.pending.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No benefits enrolled yet.</p>
              <Button onClick={() => setDialogOpen(true)} className="mt-4" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Enroll in Your First Benefit
              </Button>
            </CardContent>
          </Card>
        )}
    </div>
  )
}

