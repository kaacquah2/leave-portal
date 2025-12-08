'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'
import { APP_CONFIG } from '@/lib/app-config'

interface LoginFormProps {
  onLoginSuccess: (role: 'hr' | 'manager') => void
  onBack: () => void
}

// Mock credentials for demo purposes
const DEMO_CREDENTIALS = {
  hr: { email: 'hr@mofa.go.ke', password: 'hr123' },
  manager: { email: 'manager@mofa.go.ke', password: 'manager123' },
}

export default function LoginForm({ onLoginSuccess, onBack }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check credentials against demo accounts
    let userRole: 'hr' | 'manager' | null = null

    if (email === DEMO_CREDENTIALS.hr.email && password === DEMO_CREDENTIALS.hr.password) {
      userRole = 'hr'
    } else if (email === DEMO_CREDENTIALS.manager.email && password === DEMO_CREDENTIALS.manager.password) {
      userRole = 'manager'
    }

    if (userRole) {
      setIsLoading(false)
      onLoginSuccess(userRole)
    } else {
      setError('Invalid email or password. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-24 h-24 relative">
              <Image
                src="/mofa-logo.png"
                alt={`${APP_CONFIG.organizationName} Logo`}
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <CardTitle className="text-2xl text-foreground">{APP_CONFIG.organizationNameShort}</CardTitle>
          <CardDescription className="text-base mt-2">{APP_CONFIG.appDescription}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <Input
                type="email"
                placeholder="your.email@mofa.go.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
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

          <Button
            onClick={onBack}
            variant="ghost"
            className="w-full mt-4"
            disabled={isLoading}
          >
            Back to Home
          </Button>

          {/* Demo credentials hint */}
          <div className="mt-6 p-3 bg-secondary/10 border border-secondary/20 rounded-lg">
            <p className="text-xs font-semibold text-foreground mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><span className="font-semibold">HR Officer:</span> hr@mofa.go.ke / hr123</p>
              <p><span className="font-semibold">Manager:</span> manager@mofa.go.ke / manager123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
