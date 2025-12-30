'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { APP_CONFIG } from '@/lib/app-config'

interface LoginFormProps {
  onLoginSuccess?: (role: 'hr' | 'manager' | 'employee' | 'admin', staffId?: string) => void
  onBack: () => void
}

interface LoginError {
  error: string
  errorCode?: string
  troubleshooting?: string[]
  employmentStatus?: string
}

export default function LoginForm({ onLoginSuccess, onBack }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [errorDetails, setErrorDetails] = useState<LoginError | null>(null)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setErrorDetails(null)
    setShowTroubleshooting(false)
    setIsLoading(true)

    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid email or password. Please try again.')
        setErrorDetails(data as LoginError)
        setShowTroubleshooting(!!data.troubleshooting)
        setIsLoading(false)
        return
      }

      // Clear any previous errors on successful login
      setError('')
      setErrorDetails(null)
      setShowTroubleshooting(false)

      // Token is stored in httpOnly cookie automatically
      // No need to store in localStorage
      
      // Verify authentication was successful by checking cookie
      // Note: httpOnly cookies can't be read by JS, but we can verify
      // by making a test request to /api/auth/me
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
        try {
          const { apiRequest } = await import('@/lib/api-config')
          const verifyResponse = await apiRequest('/api/auth/me', { method: 'GET' })
          if (verifyResponse.ok) {
            const verifyUser = await verifyResponse.json()
            console.log('[Login] Authentication verified - cookie set successfully:', {
              userId: verifyUser.id,
              email: verifyUser.email,
              role: verifyUser.role,
            })
          } else {
            console.warn('[Login] Warning: Login succeeded but cookie verification failed')
          }
        } catch (verifyError) {
          console.warn('[Login] Could not verify cookie after login:', verifyError)
        }
      }

      // Redirect to appropriate portal based on role
      const role = data.user.role as 'hr' | 'manager' | 'employee' | 'admin'
      const roleRoutes: Record<string, string> = {
        admin: '/admin',
        hr: '/hr',
        manager: '/manager',
        employee: '/employee',
      }
      
      const redirectPath = roleRoutes[role] || '/'
      
      // Call callback if provided (for backward compatibility)
      if (onLoginSuccess) {
        onLoginSuccess(role, data.user.staffId || undefined)
      }
      
      router.push(redirectPath)
    } catch (err) {
      setError('An error occurred. Please try again.')
      setErrorDetails({
        error: 'An error occurred. Please try again.',
        troubleshooting: [
          'Check your internet connection',
          'Clear browser cookies and try again',
          'Try using a different browser',
          'Contact IT support if the issue persists',
        ],
      })
      setShowTroubleshooting(true)
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6">
      {/* MoFA Blue Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-primary"></div>
      
      <Card className="w-full max-w-md shadow-lg border border-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 relative">
              <Image
                src="/mofa-logo.png"
                alt={`${APP_CONFIG.organizationName} Logo`}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl text-foreground">{APP_CONFIG.organizationNameShort}</CardTitle>
          <CardDescription className="text-sm sm:text-base mt-2">{APP_CONFIG.appDescription}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <Input
                type="email"
                placeholder="your.email@mofa.gov.gh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                    {errorDetails?.employmentStatus && (
                      <p className="text-xs text-destructive/80 mt-1">
                        Status: {errorDetails.employmentStatus}
                      </p>
                    )}
                  </div>
                </div>

                {errorDetails?.troubleshooting && errorDetails.troubleshooting.length > 0 && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                    >
                      {showTroubleshooting ? 'Hide' : 'Show'} Troubleshooting Steps
                    </Button>
                    
                    {showTroubleshooting && (
                      <div className="p-3 bg-muted/50 border border-border rounded-lg space-y-2">
                        <p className="text-xs font-medium text-foreground mb-2">
                          Try these steps to resolve the issue:
                        </p>
                        <ul className="space-y-1.5">
                          {errorDetails.troubleshooting.map((step, index) => (
                            <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="pt-2 mt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            If the issue persists, please contact{' '}
                            <span className="font-medium">HR</span> or{' '}
                            <span className="font-medium">IT Support</span> for assistance.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="link"
              className="text-sm"
              onClick={async () => {
                if (!email) {
                  alert('Please enter your email address first')
                  return
                }
                try {
                  const { apiRequest } = await import('@/lib/api-config')
                  const response = await apiRequest('/api/auth/forgot-password', {
                    method: 'POST',
                    body: JSON.stringify({ email }),
                  })
                  const data = await response.json()
                  if (response.ok) {
                    alert(data.message || 'If an account with that email exists, a password reset link has been sent to your email.')
                  } else {
                    alert(data.error || 'Failed to process password reset request. Please contact HR for assistance.')
                  }
                } catch (err) {
                  alert('An error occurred. Please contact HR for assistance.')
                }
              }}
            >
              Forgot Password?
            </Button>
          </div>

          <Button
            onClick={onBack}
            variant="ghost"
            className="w-full mt-2"
            disabled={isLoading}
          >
            Back to Home
          </Button>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Ministry of Fisheries and Aquaculture (MoFA), Ghana
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
