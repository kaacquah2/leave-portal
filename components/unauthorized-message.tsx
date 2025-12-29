'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface UnauthorizedMessageProps {
  message?: string
  requiredPermission?: string
  requiredRole?: string
}

export default function UnauthorizedMessage({ 
  message, 
  requiredPermission, 
  requiredRole 
}: UnauthorizedMessageProps) {
  const defaultMessage = message || 
    (requiredPermission ? `You don't have the required permission: ${requiredPermission}` :
     requiredRole ? `This feature requires the ${requiredRole} role` :
     "You don't have permission to access this resource.")

  return (
    <div className="p-8">
      <Card className="border-2 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">{defaultMessage}</p>
          {(requiredPermission || requiredRole) && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-semibold mb-2">Required Access:</p>
              {requiredPermission && (
                <p className="text-sm text-muted-foreground">Permission: {requiredPermission}</p>
              )}
              {requiredRole && (
                <p className="text-sm text-muted-foreground">Role: {requiredRole}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

