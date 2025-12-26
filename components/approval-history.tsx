'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, CheckCircle2, XCircle, User, MessageSquare, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ApprovalHistoryEntry {
  id: string
  leaveRequestId: string
  action: 'submitted' | 'approved' | 'rejected' | 'delegated' | 'escalated' | 'reminder_sent' | 'recalled'
  performedBy: string
  performedByName: string
  performedAt: string
  level?: number
  comments?: string
  previousStatus?: string
  newStatus?: string
  metadata?: Record<string, any>
}

interface ApprovalHistoryProps {
  leaveRequestId: string
}

export default function ApprovalHistory({ leaveRequestId }: ApprovalHistoryProps) {
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [leaveRequestId])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/approvals/history?leaveRequestId=${leaveRequestId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
      console.error('Error fetching approval history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'delegated':
        return <ArrowRight className="h-4 w-4 text-amber-500" />
      case 'escalated':
        return <ArrowRight className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      submitted: 'outline',
      approved: 'default',
      rejected: 'destructive',
      delegated: 'secondary',
      escalated: 'secondary',
      reminder_sent: 'outline',
    }

    return (
      <Badge variant={variants[action] || 'outline'}>
        {action.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading approval history...
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
          <CardDescription>Track all approval actions for this leave request</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          No approval history available yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval History</CardTitle>
        <CardDescription>Complete timeline of all approval actions</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-0">
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(entry.action)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getActionBadge(entry.action)}
                      {entry.level && (
                        <Badge variant="outline" className="text-xs">
                          Level {entry.level}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.performedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{entry.performedByName}</span>
                  </div>
                  {entry.comments && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{entry.comments}</span>
                    </div>
                  )}
                  {entry.metadata && (
                    <div className="text-xs text-muted-foreground pl-5">
                      {entry.metadata.delegatedToName && (
                        <div>Delegated to: {entry.metadata.delegatedToName}</div>
                      )}
                      {entry.metadata.escalatedTo && (
                        <div>Escalated to: {entry.metadata.escalatedTo}</div>
                      )}
                    </div>
                  )}
                  {entry.previousStatus && entry.newStatus && (
                    <div className="text-xs text-muted-foreground pl-5">
                      Status: {entry.previousStatus} → {entry.newStatus}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

