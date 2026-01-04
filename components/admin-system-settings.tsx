'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Save, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type { ComponentType } from 'react'
import PushNotificationSettings from '@/components/push-notification-settings'
import UserRoleManagement from '@/components/user-role-management'
import AuditLogViewer from '@/components/audit-log-viewer'
import SystemHealth from '@/components/system-health'

// Type-safe icon components to work around React 19 type issues
const SaveIcon = Save as ComponentType<{ className?: string }>
const EyeIcon = Eye as ComponentType<{ className?: string }>
const EyeOffIcon = EyeOff as ComponentType<{ className?: string }>

export default function AdminSystemSettings() {
  const [showPassword, setShowPassword] = useState(false)
  
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground mt-1">Configure system-wide parameters</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic system configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">System Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg"
              defaultValue="HR Staff Leave Portal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Organization</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg"
              defaultValue="Ministry of Fisheries and Aquaculture"
            />
          </div>
          <Button className="gap-2">
            <SaveIcon className="w-4 h-4" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>Email server settings for notifications and password reset</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Note:</strong> Email configuration can be set via environment variables or through this interface.
            </p>
            <p className="text-xs text-blue-700">
              Environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">SMTP Server (Host)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="smtp.gmail.com"
              defaultValue={process.env.SMTP_HOST || ''}
            />
            <p className="text-xs text-muted-foreground mt-1">Example: smtp.gmail.com, smtp.office365.com</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">SMTP Port</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="587"
                defaultValue={process.env.SMTP_PORT || '587'}
              />
              <p className="text-xs text-muted-foreground mt-1">587 (TLS) or 465 (SSL)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Use SSL/TLS</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option value="false">TLS (Port 587)</option>
                <option value="true">SSL (Port 465)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">SMTP Username</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="your-email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">SMTP Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 pr-10 border rounded-lg"
                placeholder="Your email password or app password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For Gmail, use an App Password instead of your regular password
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">From Email Address</label>
            <input
              type="email"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="noreply@mofa.gov.gh"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">From Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="HR Leave Portal"
              defaultValue="HR Leave Portal"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-2">
              <SaveIcon className="w-4 h-4" />
              Save Email Settings
            </Button>
            <Button variant="outline" type="button">
              Test Email Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Security and authentication configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password Complexity</p>
              <p className="text-sm text-muted-foreground">Require strong passwords</p>
            </div>
            <input type="checkbox" defaultChecked />
          </div>
          <Button className="gap-2">
            <SaveIcon className="w-4 h-4" />
            Save Security Settings
          </Button>
        </CardContent>
      </Card>

      {/* Push Notification Settings */}
      <div className="mt-6">
        <PushNotificationSettings />
      </div>

      {/* User Role Management */}
      <div className="mt-6">
        <UserRoleManagement />
      </div>
    </div>
  )
}

// Export additional components for use in separate pages
export { AuditLogViewer, SystemHealth }

