'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, BookOpen, Award, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface TrainingRecord {
  id: string
  trainingProgramId: string
  trainingProgram: {
    title: string
    description: string
    provider: string
    type: string
    startDate: string
    endDate: string
    status: string
  }
  status: string
  certificateUrl?: string
  rating?: number
  feedback?: string
  createdAt: string
}

export default function EmployeeTrainingRecords() {
  const [trainings, setTrainings] = useState<TrainingRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrainingRecords()
  }, [])

  const fetchTrainingRecords = async () => {
    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/employee/training-records')

      if (response.ok) {
        const data = await response.json()
        setTrainings(data)
      } else {
        setTrainings([])
      }
    } catch (error) {
      console.error('Error fetching training records:', error)
      setTrainings([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      registered: 'outline',
      attended: 'secondary',
      completed: 'default',
      absent: 'destructive',
    }

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">Loading training records...</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div>
        <h1 className="text-3xl font-bold">Training Records</h1>
        <p className="text-muted-foreground mt-1">View your training and development history</p>
      </div>

      {trainings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No training records found.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Training records will appear here once you register for or attend training programs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trainings.map((training) => (
            <Card key={training.id} className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <CardTitle>{training.trainingProgram.title}</CardTitle>
                  </div>
                  {getStatusBadge(training.status)}
                </div>
                <CardDescription>{training.trainingProgram.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(training.trainingProgram.startDate).toLocaleDateString()} -{' '}
                      {new Date(training.trainingProgram.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Provider: </span>
                    <span className="font-medium">{training.trainingProgram.provider}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type: </span>
                    <span className="font-medium capitalize">{training.trainingProgram.type}</span>
                  </div>
                  {training.rating && (
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <span>Rating: {training.rating}/5</span>
                    </div>
                  )}
                </div>
                {training.feedback && (
                  <div className="pt-2 border-t">
                    <p className="text-sm">
                      <span className="font-medium">Feedback: </span>
                      {training.feedback}
                    </p>
                  </div>
                )}
                {training.certificateUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(training.certificateUrl, '_blank')}
                    className="mt-2"
                  >
                    <Award className="h-4 w-4 mr-2" />
                    View Certificate
                  </Button>
                )}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Registered {formatDistanceToNow(new Date(training.createdAt), { addSuffix: true })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

