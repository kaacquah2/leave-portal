'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Award, Star } from 'lucide-react'
import type { ReturnType } from '@/lib/data-store'

interface EmployeePerformanceReviewsProps {
  store: ReturnType<typeof import('@/lib/data-store').useDataStore>
  staffId: string
}

export default function EmployeePerformanceReviews({ store, staffId }: EmployeePerformanceReviewsProps) {
  const reviews = store.performanceReviews
    .filter(r => r.staffId === staffId)
    .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime())

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 3.5) return 'text-blue-600'
    if (rating >= 2.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="p-8 space-y-6 bg-gradient-to-b from-blue-50 to-background">
      <div>
        <h1 className="text-3xl font-bold">Performance Reviews</h1>
        <p className="text-muted-foreground mt-1">View your performance reviews and feedback</p>
      </div>

      {reviews.length === 0 ? (
        <Card className="border-2 border-blue-200">
          <CardContent className="py-12">
            <div className="text-center">
              <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No performance reviews available yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <Card key={review.id} className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{review.reviewPeriod}</CardTitle>
                    <CardDescription>
                      Reviewed on {new Date(review.reviewDate).toLocaleDateString()} by {review.reviewedBy}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-3xl font-bold ${getRatingColor(review.rating)}`}>
                      {review.rating}
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {review.strengths.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-green-700">Strengths</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {review.strengths.map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.areasForImprovement.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-amber-700">Areas for Improvement</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {review.areasForImprovement.map((area, idx) => (
                        <li key={idx}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.goals.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-blue-700">Goals</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {review.goals.map((goal, idx) => (
                        <li key={idx}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {review.comments && (
                  <div>
                    <h4 className="font-semibold mb-2">Comments</h4>
                    <p className="text-sm text-muted-foreground">{review.comments}</p>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <Badge variant={review.status === 'completed' ? 'default' : 'secondary'}>
                    {review.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reviews.length > 0 && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Reviews</span>
                <span className="font-medium">{reviews.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Rating</span>
                <span className="font-medium">
                  {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}/5
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latest Review</span>
                <span className="font-medium">
                  {reviews[0]?.reviewPeriod} ({reviews[0]?.rating}/5)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

