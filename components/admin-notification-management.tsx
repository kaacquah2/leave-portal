'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bell, Mail, AlertTriangle, Save } from 'lucide-react'
import { useEffect, useState } from 'react'

interface NotificationConfig {
  emailEnabled: boolean
  systemEnabled: boolean
  backupFailureEnabled: boolean
  syncFailureEnabled: boolean
  authFailureEnabled: boolean
  policyChangeEnabled: boolean
  emailServer: string
  emailFrom: string
}

export default function AdminNotificationManagement() {
  const [config, setConfig] = useState<NotificationConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const res = await apiRequest('/api/admin/notifications/config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Error fetching notification config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config) return

    try {
      setSaving(true)
      setMessage(null)
      const { apiRequest } = await import('@/lib/api-config')
      const res = await apiRequest('/api/admin/notifications/config', {
        method: 'PUT',
        body: JSON.stringify({ config }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Notification settings saved successfully' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading notification settings...</p>
        </div>
      </div>
    )
  }

  if (!config) return null

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Management</h1>
        <p className="text-muted-foreground mt-1">Configure system notifications and alerts</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>{message.text}</p>
        </div>
      )}

      {/* Notification Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Enable or disable notification channels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-semibold">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send notifications via email</p>
            </div>
            <input
              type="checkbox"
              checked={config.emailEnabled}
              onChange={(e) => setConfig({ ...config, emailEnabled: e.target.checked })}
              className="w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-semibold">System Notifications</Label>
              <p className="text-sm text-muted-foreground">Show in-app notifications</p>
            </div>
            <input
              type="checkbox"
              checked={config.systemEnabled}
              onChange={(e) => setConfig({ ...config, systemEnabled: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alert Types
          </CardTitle>
          <CardDescription>Configure which alerts to send</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-semibold">Backup Failure Alerts</Label>
              <p className="text-sm text-muted-foreground">Notify when backups fail</p>
            </div>
            <input
              type="checkbox"
              checked={config.backupFailureEnabled}
              onChange={(e) => setConfig({ ...config, backupFailureEnabled: e.target.checked })}
              className="w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-semibold">Sync Failure Alerts</Label>
              <p className="text-sm text-muted-foreground">Notify when sync operations fail</p>
            </div>
            <input
              type="checkbox"
              checked={config.syncFailureEnabled}
              onChange={(e) => setConfig({ ...config, syncFailureEnabled: e.target.checked })}
              className="w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-semibold">Authentication Failure Alerts</Label>
              <p className="text-sm text-muted-foreground">Notify on failed login attempts</p>
            </div>
            <input
              type="checkbox"
              checked={config.authFailureEnabled}
              onChange={(e) => setConfig({ ...config, authFailureEnabled: e.target.checked })}
              className="w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-semibold">Policy Change Notifications</Label>
              <p className="text-sm text-muted-foreground">Notify when policies are updated</p>
            </div>
            <input
              type="checkbox"
              checked={config.policyChangeEnabled}
              onChange={(e) => setConfig({ ...config, policyChangeEnabled: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>Configure email server settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email Server</Label>
            <Input
              value={config.emailServer}
              onChange={(e) => setConfig({ ...config, emailServer: e.target.value })}
              placeholder="smtp.example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label>From Email Address</Label>
            <Input
              value={config.emailFrom}
              onChange={(e) => setConfig({ ...config, emailFrom: e.target.value })}
              placeholder="noreply@mofa.gov.gh"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}

