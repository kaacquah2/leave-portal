'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Target, Users, TrendingUp, Award, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { apiRequest } from '@/lib/api-config'
import { toast } from 'sonner'

interface PerformanceGoal {
  id: string
  staffId: string
  title: string
  description?: string
  category: string
  targetValue?: string
  currentValue?: string
  dueDate?: string
  status: string
  progress: number
  staff?: {
    staffId: string
    firstName: string
    lastName: string
  }
}

interface Feedback360 {
  id: string
  staffId: string
  reviewerName: string
  reviewerRole: string
  reviewPeriod: string
  rating: number
  status: string
  staff?: {
    staffId: string
    firstName: string
    lastName: string
  }
}

interface PerformanceImprovementPlan {
  id: string
  staffId: string
  title: string
  status: string
  startDate: string
  endDate: string
  staff?: {
    staffId: string
    firstName: string
    lastName: string
  }
}

interface Promotion {
  id: string
  staffId: string
  fromPosition: string
  toPosition: string
  promotionDate: string
  status: string
  staff?: {
    staffId: string
    firstName: string
    lastName: string
  }
}

interface PerformanceManagementProps {
  userRole?: string
  staffId?: string
}

export default function PerformanceManagement({ userRole, staffId }: PerformanceManagementProps) {
  const [activeTab, setActiveTab] = useState('goals')
  const [goals, setGoals] = useState<PerformanceGoal[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback360[]>([])
  const [pips, setPips] = useState<PerformanceImprovementPlan[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)

  const isHR = userRole === 'hr' || userRole === 'hr_officer' || userRole === 'hr_director' || userRole === 'admin'

  useEffect(() => {
    fetchData()
  }, [activeTab, staffId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = staffId ? `?staffId=${staffId}` : ''

      switch (activeTab) {
        case 'goals':
          const goalsRes = await apiRequest(`/api/performance/goals${params}`)
          if (goalsRes.ok) {
            setGoals(await goalsRes.json())
          }
          break
        case 'feedback':
          const feedbackRes = await apiRequest(`/api/performance/feedback360${params}`)
          if (feedbackRes.ok) {
            setFeedbacks(await feedbackRes.json())
          }
          break
        case 'pips':
          const pipsRes = await apiRequest(`/api/performance/pips${params}`)
          if (pipsRes.ok) {
            setPips(await pipsRes.json())
          }
          break
        case 'promotions':
          const promotionsRes = await apiRequest(`/api/performance/promotions${params}`)
          if (promotionsRes.ok) {
            setPromotions(await promotionsRes.json())
          }
          break
      }
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'submitted':
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'completed':
      case 'reviewed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
      case 'on_hold':
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'extended':
      case 'terminated':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Performance Management</h1>
        <p className="text-muted-foreground mt-1">Manage goals, feedback, improvement plans, and promotions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="goals" className="gap-2">
            <Target className="w-4 h-4" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <Users className="w-4 h-4" />
            360 Feedback
          </TabsTrigger>
          <TabsTrigger value="pips" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Improvement Plans
          </TabsTrigger>
          <TabsTrigger value="promotions" className="gap-2">
            <Award className="w-4 h-4" />
            Promotions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Performance Goals</CardTitle>
                  <CardDescription>Track and manage performance goals</CardDescription>
                </div>
                {isHR && (
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Goal
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading goals...</p>
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No goals found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{goal.title}</h3>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-muted-foreground">Category: {goal.category}</span>
                            {goal.dueDate && (
                              <span className="text-muted-foreground">Due: {formatDate(goal.dueDate)}</span>
                            )}
                            <Badge className={getStatusColor(goal.status)}>{goal.status}</Badge>
                          </div>
                          {goal.progress !== undefined && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span>Progress</span>
                                <span>{goal.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${goal.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {isHR && (
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>360-Degree Feedback</CardTitle>
                  <CardDescription>Multi-source performance feedback</CardDescription>
                </div>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Feedback
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading feedback...</p>
                </div>
              ) : feedbacks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No feedback found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              {feedback.staff?.firstName} {feedback.staff?.lastName}
                            </h3>
                            <Badge>Rating: {feedback.rating}/5</Badge>
                            <Badge className={getStatusColor(feedback.status)}>{feedback.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Reviewed by: {feedback.reviewerName} ({feedback.reviewerRole})
                          </p>
                          <p className="text-sm text-muted-foreground">Period: {feedback.reviewPeriod}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pips" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Performance Improvement Plans</CardTitle>
                  <CardDescription>Track employee improvement plans</CardDescription>
                </div>
                {isHR && (
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New PIP
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading improvement plans...</p>
                </div>
              ) : pips.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No improvement plans found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pips.map((pip) => (
                    <div key={pip.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{pip.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-muted-foreground">
                              {formatDate(pip.startDate)} - {formatDate(pip.endDate)}
                            </span>
                            <Badge className={getStatusColor(pip.status)}>{pip.status}</Badge>
                          </div>
                          {pip.staff && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {pip.staff.firstName} {pip.staff.lastName} ({pip.staff.staffId})
                            </p>
                          )}
                        </div>
                        {isHR && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Promotions</CardTitle>
                  <CardDescription>Track employee promotions and career progression</CardDescription>
                </div>
                {isHR && (
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Promotion
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading promotions...</p>
                </div>
              ) : promotions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No promotions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {promotions.map((promotion) => (
                    <div key={promotion.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              {promotion.fromPosition} → {promotion.toPosition}
                            </h3>
                            <Badge className={getStatusColor(promotion.status)}>{promotion.status}</Badge>
                          </div>
                          {promotion.staff && (
                            <p className="text-sm text-muted-foreground">
                              {promotion.staff.firstName} {promotion.staff.lastName} ({promotion.staff.staffId})
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            Promotion Date: {formatDate(promotion.promotionDate)}
                          </p>
                        </div>
                        {isHR && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

