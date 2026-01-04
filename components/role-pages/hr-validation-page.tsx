/**
 * HR Validation Page Component
 * Used by: HR Officer
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle, 
  XCircle, 
  FileText,
  AlertCircle,
  Clock
} from 'lucide-react'
import { apiRequest } from '@/lib/api-config'

export default function HRValidationPage() {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPendingValidations()
  }, [])

  const fetchPendingValidations = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiRequest('/api/leaves/pending/hr-validation')
      if (response.ok) {
        const data = await response.json()
        setLeaves(data.leaves || data || [])
      } else {
        setError('Failed to fetch pending validations')
      }
    } catch (err) {
      console.error('Error fetching pending validations:', err)
      setError('An error occurred while fetching pending validations')
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async (id: string, validated: boolean) => {
    try {
      setValidatingId(id)
      const response = await apiRequest(`/api/leaves/hr-validate/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          validated,
          comments: comments[id] || '',
        }),
      })
      if (response.ok) {
        setComments({ ...comments, [id]: '' })
        fetchPendingValidations()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to validate leave')
      }
    } catch (err) {
      console.error('Error validating leave:', err)
      alert('An error occurred while validating leave')
    } finally {
      setValidatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pending HR Validation</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Validate leave eligibility before final approval
          </p>
        </div>
        <Button onClick={fetchPendingValidations} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {leaves.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              No pending validations at this time
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {leaves.map((leave) => (
            <Card key={leave.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {leave.staffName || `${leave.staff?.firstName} ${leave.staff?.lastName}`}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {leave.days} days
                    </Badge>
                    {leave.requiresExternalClearance && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        External Clearance Required
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Leave Type:</span>
                      <span className="ml-2 font-medium">{leave.leaveType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Period:</span>
                      <span className="ml-2 font-medium">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unit:</span>
                      <span className="ml-2 font-medium">{leave.staff?.unit || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Directorate:</span>
                      <span className="ml-2 font-medium">{leave.staff?.directorate || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Validation Comments
                    </label>
                    <Textarea
                      placeholder="Enter validation comments..."
                      value={comments[leave.id] || ''}
                      onChange={(e) => setComments({ ...comments, [leave.id]: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleValidate(leave.id, true)}
                      disabled={validatingId === leave.id}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Validate
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleValidate(leave.id, false)}
                      disabled={validatingId === leave.id}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

