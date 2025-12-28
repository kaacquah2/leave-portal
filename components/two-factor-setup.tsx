'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { Shield, CheckCircle, XCircle, Copy, RefreshCw, Key } from 'lucide-react'

interface TwoFactorSetupProps {
  onComplete?: () => void
}

export default function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const { toast } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setupStep, setSetupStep] = useState<'disabled' | 'generating' | 'verifying' | 'enabled'>('disabled')
  const [secret, setSecret] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verificationCode, setVerificationCode] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/auth/2fa/status')
      if (response.ok) {
        const data = await response.json()
        setEnabled(data.enabled || false)
        if (data.enabled) {
          setSetupStep('enabled')
        }
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSecret = async () => {
    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/auth/2fa/generate', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setSecret(data.secret)
        setEmail(data.email)
        
        // Generate QR code
        try {
          const QRCode = (await import('qrcode')).default
          const otpAuthUrl = `otpauth://totp/HR%20Leave%20Portal:${encodeURIComponent(data.email)}?secret=${data.secret}&issuer=HR%20Leave%20Portal`
          const qr = await QRCode.toDataURL(otpAuthUrl)
          setQrCode(qr)
        } catch (error) {
          console.error('Error generating QR code:', error)
          // QR code generation failed, but we can still proceed with manual entry
        }
        
        setBackupCodes(data.backupCodes || [])
        setSetupStep('verifying')
      } else {
        throw new Error('Failed to generate 2FA secret')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate 2FA setup',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter a valid 6-digit code',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({
          code: verificationCode,
          secret,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setEnabled(true)
        setSetupStep('enabled')
        setBackupCodes(data.backupCodes || backupCodes)
        toast({
          title: 'Success',
          description: 'Two-factor authentication has been enabled',
        })
        if (onComplete) onComplete()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Invalid verification code')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify code',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will reduce your account security.')) {
      return
    }

    try {
      setLoading(true)
      const { apiRequest } = await import('@/lib/api-config')
      const response = await apiRequest('/api/auth/2fa/disable', {
        method: 'POST',
      })

      if (response.ok) {
        setEnabled(false)
        setSetupStep('disabled')
        setSecret(null)
        setQrCode(null)
        setBackupCodes([])
        toast({
          title: 'Success',
          description: 'Two-factor authentication has been disabled',
        })
      } else {
        throw new Error('Failed to disable 2FA')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disable 2FA',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const copyBackupCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: 'Copied',
      description: 'Backup code copied to clipboard',
    })
  }

  const copyAllBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    toast({
      title: 'Copied',
      description: 'All backup codes copied to clipboard',
    })
  }

  if (loading && setupStep === 'disabled') {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
        <p className="text-muted-foreground mt-1">Add an extra layer of security to your account</p>
      </div>

      {enabled ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  2FA Enabled
                </CardTitle>
                <CardDescription>Your account is protected with two-factor authentication</CardDescription>
              </div>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                Two-factor authentication is active. You'll need to enter a code from your authenticator app when logging in.
              </AlertDescription>
            </Alert>

            {backupCodes.length > 0 && (
              <div>
                <Label>Backup Codes</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Save these codes in a safe place. You can use them to access your account if you lose your device.
                </p>
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="flex items-center justify-between font-mono text-sm">
                      <span>{code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyBackupCode(code)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={copyAllBackupCodes}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All Codes
                </Button>
              </div>
            )}

            <Button variant="destructive" onClick={disable2FA} disabled={loading}>
              <XCircle className="w-4 h-4 mr-2" />
              Disable 2FA
            </Button>
          </CardContent>
        </Card>
      ) : setupStep === 'verifying' ? (
        <Card>
          <CardHeader>
            <CardTitle>Verify Setup</CardTitle>
            <CardDescription>Scan the QR code and enter the verification code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              {qrCode && (
                <div className="p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              )}

              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Or enter this code manually:</p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="px-3 py-2 bg-muted rounded font-mono text-sm">{secret}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => secret && navigator.clipboard.writeText(secret)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="w-full max-w-sm space-y-2">
                <Label htmlFor="verificationCode">Enter 6-digit code from your app</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl font-mono tracking-widest"
                />
                <Button
                  onClick={verifyAndEnable}
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Verify and Enable
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setSetupStep('disabled')
                  setSecret(null)
                  setQrCode(null)
                  setVerificationCode('')
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Enable Two-Factor Authentication</CardTitle>
            <CardDescription>
              Protect your account with an additional layer of security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                Two-factor authentication adds an extra layer of security. You'll need to enter a code from your authenticator app (like Google Authenticator or Authy) when logging in.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="font-medium">How it works:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Scan the QR code with your authenticator app</li>
                <li>Enter the 6-digit code to verify</li>
                <li>Save your backup codes in a safe place</li>
                <li>Use the code from your app when logging in</li>
              </ol>
            </div>

            <Button onClick={generateSecret} disabled={loading} className="w-full">
              <Shield className="w-4 h-4 mr-2" />
              {loading ? 'Generating...' : 'Enable 2FA'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

