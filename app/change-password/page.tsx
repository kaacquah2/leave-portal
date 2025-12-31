'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Image from 'next/image'
import { APP_CONFIG } from '@/lib/app-config'

function ChangePasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') || ''
  const isFirstLogin = searchParams.get('firstLogin') === 'true'
  const isExpired = searchParams.get('expired') === 'true'

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [errorDetails, setErrorDetails] = useState<any>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailInput, setEmailInput] = useState(email)

  useEffect(() => {
    if (!email && !isFirstLogin && !isExpired) {
      setError('Email is required. Please access this page from the login screen.')
    }
  }, [email, isFirstLogin, isExpired])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setErrorDetails(null)

    // Validation
    if (!emailInput && !isFirstLogin && !isExpired) {
      setError('Email is required')
      return
    }

    if (!currentPassword) {
      setError('Current password is required')
      return
    }

    if (!newPassword) {
      setError('New password is required')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          email: emailInput || undefined,
          currentPassword,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to change password')
        setErrorDetails(data)
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error('Password change error:', err)
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 relative">
                <Image
                  src="/mofa-logo.png"
                  alt={`${APP_CONFIG.organizationName} Logo`}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
            <CardTitle className="text-2xl text-foreground">Password Changed Successfully</CardTitle>
            <CardDescription className="mt-2">
              Your password has been successfully changed. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              You can now log in with your new password.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      {/* MoFA Blue Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 relative">
              <Image
                src="/mofa-logo.png"
                alt={`${APP_CONFIG.organizationName} Logo`}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <CardTitle className="text-2xl text-foreground">
            {isFirstLogin ? 'Change Password (First Login)' : isExpired ? 'Change Expired Password' : 'Change Password'}
          </CardTitle>
          <CardDescription className="mt-2">
            {isFirstLogin 
              ? 'You must change your password on first login. This is a security requirement.'
              : isExpired
              ? 'Your password has expired. Please set a new password to continue.'
              : 'Enter your current password and choose a new secure password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(isFirstLogin || isExpired) && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="text-sm font-medium">
                  {isFirstLogin ? 'First Login Required' : 'Password Expired'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isFirstLogin 
                    ? 'You must change your password before you can access the system.'
                    : 'Your password has expired (90 days maximum age). Please set a new password.'}
                </p>
              </div>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(isFirstLogin || isExpired) && (
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@mofa.gov.gh"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={isLoading || !!email}
                  required
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative mt-1">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={isLoading}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isLoading}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                    {errorDetails?.errors && Array.isArray(errorDetails.errors) && (
                      <ul className="mt-2 space-y-1">
                        {errorDetails.errors.map((err: string, index: number) => (
                          <li key={index} className="text-xs text-destructive/80">• {err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {errorDetails?.troubleshooting && Array.isArray(errorDetails.troubleshooting) && (
                  <div className="p-3 bg-muted/50 border border-border rounded-lg">
                    <p className="text-xs font-medium mb-2">Troubleshooting:</p>
                    <ul className="space-y-1">
                      {errorDetails.troubleshooting.map((step: string, index: number) => (
                        <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>

          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            className="w-full mt-2"
            disabled={isLoading}
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ChangePasswordForm />
    </Suspense>
  )
}

