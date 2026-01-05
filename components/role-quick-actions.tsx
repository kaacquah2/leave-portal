/**
 * Role-Based Quick Actions Toolbar
 * Displays role-specific action buttons based on role portal configuration
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Download, 
  UserPlus,
  Settings,
  UserCheck,
  Send,
  Eye,
  Filter,
  Plus,
  X
} from 'lucide-react'
import { getRolePortalConfig } from '@/lib/role-portals-config'
import { type UserRole } from '@/lib/roles'
import { useRouter } from 'next/navigation'

interface RoleQuickActionsProps {
  userRole: UserRole
  onAction?: (action: string) => void
  compact?: boolean
}

const actionIcons: Record<string, any> = {
  'Apply Leave': Plus,
  'Cancel Request': X,
  'Download History': Download,
  'Approve': CheckCircle,
  'Reject': XCircle,
  'Add Comment': FileText,
  'View Team Calendar': Calendar,
  'Approve with Acting Officer': UserCheck,
  'Assign Acting Officer': UserPlus,
  'View Unit Calendar': Calendar,
  'Export Report': Download,
  'View Directorate Calendar': Calendar,
  'Validate Leave': CheckCircle,
  'Reject Leave': XCircle,
  'Export PSC Report': Download,
  'Export HR Reports': Download,
  'View Acting Officer Assignments': Eye,
  'Export Ministry Report': Download,
  'Notify PSC/OHCS': Send,
  'Export Audit Trail': Download,
  'Filter / Search Requests': Filter,
  'Add User': UserPlus,
  'Edit Roles': Settings,
  'Export Logs': Download,
  'Configure System': Settings,
}

const actionRoutes: Record<string, string> = {
  'Apply Leave': 'leave',
  'Cancel Request': 'leave',
  'Download History': 'leave',
  'Approve': 'leave',
  'Reject': 'leave',
  'Add Comment': 'leave',
  'View Team Calendar': 'calendar',
  'Approve with Acting Officer': 'leave',
  'Assign Acting Officer': 'acting-appointments',
  'View Unit Calendar': 'calendar',
  'Export Report': 'reports',
  'View Directorate Calendar': 'calendar',
  'Validate Leave': 'leave',
  'Reject Leave': 'leave',
  'Export PSC Report': 'reports',
  'Export HR Reports': 'reports',
  'View Acting Officer Assignments': 'acting-appointments',
  'Export Ministry Report': 'reports',
  'Notify PSC/OHCS': 'leave',
  'Export Audit Trail': 'reports',
  'Filter / Search Requests': 'leave',
  'Add User': 'admin',
  'Edit Roles': 'admin',
  'Export Logs': 'admin',
  'Configure System': 'admin',
}

export default function RoleQuickActions({ 
  userRole, 
  onAction,
  compact = false 
}: RoleQuickActionsProps) {
  const router = useRouter()
  const config = getRolePortalConfig(userRole)
  const buttons = config?.buttons || []

  if (!buttons.length) {
    return null
  }

  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action)
    } else {
      // Default navigation behavior
      const route = actionRoutes[action]
      if (route) {
        router.push(`/${route}`)
      }
    }
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {buttons.map((button, index) => {
          const Icon = actionIcons[button] || FileText
          return (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleAction(button)}
              className="text-xs"
            >
              <Icon className="h-3 w-3 mr-1" />
              {button}
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {buttons.map((button, index) => {
              const Icon = actionIcons[button] || FileText
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start"
                  onClick={() => handleAction(button)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {button}
                </Button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

