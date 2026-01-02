'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Play, Clock, Database, Bell } from 'lucide-react'

interface JobStatus {
  name: string
  status: 'idle' | 'running' | 'success' | 'error'
  lastRun?: string
  duration?: string
  message?: string
}

export default function CronJobManager() {
  const [jobs, setJobs] = useState<Record<string, JobStatus>>({
    escalation: { name: 'Escalation Check', status: 'idle' },
    notificationQueue: { name: 'Notification Queue', status: 'idle' },
    dataRetention: { name: 'Data Retention', status: 'idle' },
  })
  const { toast } = useToast()

  const runJob = async (jobKey: string) => {
    const job = jobs[jobKey]
    if (job.status === 'running') return

    setJobs(prev => ({
      ...prev,
      [jobKey]: { ...prev[jobKey], status: 'running' },
    }))

    try {
      const endpoint = `/api/cron/${jobKey === 'notificationQueue' ? 'notification-queue' : jobKey}`
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        setJobs(prev => ({
          ...prev,
          [jobKey]: {
            ...prev[jobKey],
            status: 'success',
            lastRun: new Date().toISOString(),
            duration: data.duration,
            message: data.message,
          },
        }))
        toast({
          title: 'Success',
          description: `${job.name} completed successfully`,
        })
      } else {
        throw new Error(data.error || 'Job failed')
      }
    } catch (error: any) {
      setJobs(prev => ({
        ...prev,
        [jobKey]: {
          ...prev[jobKey],
          status: 'error',
          lastRun: new Date().toISOString(),
          message: error.message,
        },
      }))
      toast({
        title: 'Error',
        description: `Failed to run ${job.name}: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  const getJobIcon = (jobKey: string) => {
    switch (jobKey) {
      case 'escalation':
        return <Clock className="w-5 h-5" />
      case 'notificationQueue':
        return <Bell className="w-5 h-5" />
      case 'dataRetention':
        return <Database className="w-5 h-5" />
      default:
        return <Play className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: JobStatus['status']) => {
    switch (status) {
      case 'running':
        return 'text-yellow-500'
      case 'success':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Cron Job Manager</h2>
        <p className="text-muted-foreground">
          Manually trigger scheduled jobs or view their status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(jobs).map(([key, job]) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getJobIcon(key)}
                  <CardTitle className="text-lg">{job.name}</CardTitle>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                  {job.status === 'running' ? 'Running...' : 
                   job.status === 'success' ? 'Success' :
                   job.status === 'error' ? 'Error' : 'Idle'}
                </span>
              </div>
              <CardDescription>
                {key === 'escalation' && 'Checks and escalates pending approvals (Daily)'}
                {key === 'notificationQueue' && 'Processes pending notifications (Every 5 min)'}
                {key === 'dataRetention' && 'Archives and deletes expired records (Monthly)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.lastRun && (
                <div className="text-sm text-muted-foreground">
                  <div>Last run: {new Date(job.lastRun).toLocaleString()}</div>
                  {job.duration && <div>Duration: {job.duration}</div>}
                  {job.message && <div className="mt-1">{job.message}</div>}
                </div>
              )}
              <Button
                onClick={() => runJob(key)}
                disabled={job.status === 'running'}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                {job.status === 'running' ? 'Running...' : 'Run Now'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>External Cron Setup</CardTitle>
          <CardDescription>
            Configure external cron services (cron-job.org, EasyCron, etc.) to call these endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Escalation Job:</strong>
              <code className="ml-2 px-2 py-1 bg-muted rounded">
                GET /api/cron/escalation
              </code>
              <div className="text-muted-foreground mt-1">
                Schedule: Daily at 9 AM (0 9 * * *)
              </div>
            </div>
            <div>
              <strong>Notification Queue:</strong>
              <code className="ml-2 px-2 py-1 bg-muted rounded">
                GET /api/cron/notification-queue
              </code>
              <div className="text-muted-foreground mt-1">
                Schedule: Every 5 minutes (*/5 * * * *)
              </div>
            </div>
            <div>
              <strong>Data Retention:</strong>
              <code className="ml-2 px-2 py-1 bg-muted rounded">
                GET /api/cron/data-retention
              </code>
              <div className="text-muted-foreground mt-1">
                Schedule: Monthly on 1st at 2 AM (0 2 1 * *)
              </div>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <strong>Note:</strong> Add header <code>Authorization: Bearer YOUR_CRON_SECRET</code> when setting up external cron jobs.
              Set <code>CRON_SECRET</code> in your environment variables.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

