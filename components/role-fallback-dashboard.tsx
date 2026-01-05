'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface RoleFallbackDashboardProps {
  userRole: string
  onNavigate?: (tab: string) => void
}

/**
 * Fallback dashboard for unsupported or unrecognized roles
 * 
 * This component is shown when:
 * - A role doesn't have a specific dashboard implementation
 * - An unknown role is encountered
 * - The role mapping fails
 */
export default function RoleFallbackDashboard({ userRole, onNavigate }: RoleFallbackDashboardProps) {
  return (
    <div className="p-8">
      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-yellow-900">Dashboard Not Available</CardTitle>
          </div>
          <CardDescription className="text-yellow-700">
            No specific dashboard is configured for your role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-yellow-800">
              Your current role: <strong>{userRole}</strong>
            </p>
            <p className="text-sm text-yellow-800">
              This role may not have a dedicated dashboard yet, or there may be an issue with role mapping.
            </p>
          </div>
          
          <div className="mt-4 p-4 bg-white rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-sm text-yellow-900 mb-2">What you can do:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
              <li>Contact your system administrator to configure a dashboard for your role</li>
              <li>Verify that your role is correctly assigned in the system</li>
              <li>Try refreshing the page or logging out and back in</li>
            </ul>
          </div>

          {onNavigate && (
            <div className="mt-4">
              <p className="text-sm text-yellow-800 mb-2">You can still access other features:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onNavigate('leave')}
                  className="px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-900 rounded-md transition-colors"
                >
                  Leave Management
                </button>
                <button
                  onClick={() => onNavigate('staff')}
                  className="px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-900 rounded-md transition-colors"
                >
                  Staff
                </button>
                <button
                  onClick={() => onNavigate('reports')}
                  className="px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-900 rounded-md transition-colors"
                >
                  Reports
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

