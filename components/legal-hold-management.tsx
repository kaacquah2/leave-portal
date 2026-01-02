'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Lock, Unlock } from 'lucide-react'

interface LegalHold {
  id: string
  staffId: string | null
  staffName: string | null
  leaveRequestId: string | null
  reason: string
  placedBy: string
  placedAt: string
  expiresAt: string | null
  status: string
}

export default function LegalHoldManagement() {
  const [holds, setHolds] = useState<LegalHold[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [formData, setFormData] = useState({
    staffId: '',
    leaveRequestId: '',
    reason: '',
    expiresAt: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    loadHolds()
  }, [])

  const loadHolds = async () => {
    try {
      const response = await fetch('/api/legal-holds')
      if (response.ok) {
        const data = await response.json()
        setHolds(data)
      }
    } catch (error) {
      console.error('Error loading legal holds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/legal-holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          expiresAt: formData.expiresAt || undefined,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Legal hold placed successfully',
        })
        setShowDialog(false)
        setFormData({
          staffId: '',
          leaveRequestId: '',
          reason: '',
          expiresAt: '',
        })
        loadHolds()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to place legal hold',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to place legal hold',
        variant: 'destructive',
      })
    }
  }

  const handleRelease = async (id: string) => {
    if (!confirm('Are you sure you want to release this legal hold?')) {
      return
    }

    try {
      const response = await fetch(`/api/legal-holds/${id}/release`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Legal hold released successfully',
        })
        loadHolds()
      } else {
        toast({
          title: 'Error',
          description: 'Failed to release legal hold',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to release legal hold',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Legal Holds</h2>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Place Legal Hold
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Place Legal Hold</DialogTitle>
              <DialogDescription>
                Freeze records during investigations. Only HR Director or Chief Director can place legal holds.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Staff ID (optional - leave blank for all staff)</Label>
                <Input
                  value={formData.staffId}
                  onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  placeholder="MOFA-001234"
                />
              </div>
              <div>
                <Label>Leave Request ID (optional)</Label>
                <Input
                  value={formData.leaveRequestId}
                  onChange={(e) => setFormData({ ...formData, leaveRequestId: e.target.value })}
                  placeholder="Leave request ID"
                />
              </div>
              <div>
                <Label>Reason *</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Reason for legal hold (e.g., ongoing investigation)"
                  required
                />
              </div>
              <div>
                <Label>Expiration Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
              <Button type="submit">Place Legal Hold</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {holds.map((hold) => (
          <Card key={hold.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-red-500" />
                    Legal Hold
                  </CardTitle>
                  <CardDescription>
                    {hold.staffName || 'All Staff'} {hold.leaveRequestId && `- Leave Request ${hold.leaveRequestId}`}
                  </CardDescription>
                </div>
                {hold.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRelease(hold.id)}
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Release
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Reason:</strong> {hold.reason}
                </div>
                <div>
                  <strong>Placed:</strong> {new Date(hold.placedAt).toLocaleDateString()}
                </div>
                {hold.expiresAt && (
                  <div>
                    <strong>Expires:</strong> {new Date(hold.expiresAt).toLocaleDateString()}
                  </div>
                )}
                <div>
                  <strong>Status:</strong> <span className={hold.status === 'active' ? 'text-red-600' : 'text-green-600'}>{hold.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

