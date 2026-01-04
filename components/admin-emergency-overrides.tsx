'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Unlock, Lock, KeyRound, FileCheck, Shield } from 'lucide-react'
import { useState } from 'react'

export default function AdminEmergencyOverrides() {
  const [leaveId, setLeaveId] = useState('')
  const [leaveAction, setLeaveAction] = useState('approve')
  const [leaveReason, setLeaveReason] = useState('')
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [accountAction, setAccountAction] = useState('unlock')
  const [accountReason, setAccountReason] = useState('')
  const [policyId, setPolicyId] = useState('')
  const [policyOverride, setPolicyOverride] = useState(true)
  const [policyReason, setPolicyReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleLeaveOverride = async () => {
    if (!leaveId) {
      setMessage({ type: 'error', text: 'Leave ID is required' })
      return
    }

    try {
      setLoading(true)
      setMessage(null)
      const { apiRequest } = await import('@/lib/api-config')
      const res = await apiRequest('/api/admin/overrides/leave', {
        method: 'POST',
        body: JSON.stringify({
          leaveId,
          action: leaveAction,
          reason: leaveReason || 'Admin override',
        }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: `Leave request ${leaveAction}d successfully` })
        setLeaveId('')
        setLeaveReason('')
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || 'Failed to override leave' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to override leave' })
    } finally {
      setLoading(false)
    }
  }

  const handleAccountOverride = async () => {
    if (!userId && !userEmail) {
      setMessage({ type: 'error', text: 'User ID or Email is required' })
      return
    }

    try {
      setLoading(true)
      setMessage(null)
      const { apiRequest } = await import('@/lib/api-config')
      const res = await apiRequest('/api/admin/overrides/account', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId || undefined,
          email: userEmail || undefined,
          action: accountAction,
          reason: accountReason || 'Admin override',
        }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: `Account ${accountAction}ed successfully` })
        setUserId('')
        setUserEmail('')
        setAccountReason('')
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || 'Failed to override account' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to override account' })
    } finally {
      setLoading(false)
    }
  }

  const handlePolicyOverride = async () => {
    if (!policyId) {
      setMessage({ type: 'error', text: 'Policy ID is required' })
      return
    }

    try {
      setLoading(true)
      setMessage(null)
      const { apiRequest } = await import('@/lib/api-config')
      const res = await apiRequest('/api/admin/overrides/policy', {
        method: 'POST',
        body: JSON.stringify({
          policyId,
          override: policyOverride,
          reason: policyReason || 'Admin override',
        }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: `Policy override ${policyOverride ? 'enabled' : 'disabled'} successfully` })
        setPolicyId('')
        setPolicyReason('')
      } else {
        const error = await res.json()
        setMessage({ type: 'error', text: error.error || 'Failed to override policy' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to override policy' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-8 h-8 text-orange-600" />
        <div>
          <h1 className="text-3xl font-bold">Emergency Overrides</h1>
          <p className="text-muted-foreground mt-1">Admin override functions with full audit logging</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>{message.text}</p>
        </div>
      )}

      {/* Leave Override */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Force Leave Approval/Reversal
          </CardTitle>
          <CardDescription>Override leave request status (with audit logging)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Leave Request ID</Label>
            <Input
              value={leaveId}
              onChange={(e) => setLeaveId(e.target.value)}
              placeholder="Enter leave request ID"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Action</Label>
            <select
              value={leaveAction}
              onChange={(e) => setLeaveAction(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="reverse">Reverse (Cancel)</option>
            </select>
          </div>
          <div>
            <Label>Reason (Required for audit)</Label>
            <Input
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Reason for override"
              className="mt-1"
            />
          </div>
          <Button onClick={handleLeaveOverride} disabled={loading} variant="destructive">
            <FileCheck className="w-4 h-4 mr-2" />
            {loading ? 'Processing...' : 'Override Leave'}
          </Button>
        </CardContent>
      </Card>

      {/* Account Override */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5" />
            Unlock/Lock Account
          </CardTitle>
          <CardDescription>Manage user account access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>User ID (Optional)</Label>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User ID"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@mofa.gov.gh"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Action</Label>
            <select
              value={accountAction}
              onChange={(e) => setAccountAction(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="unlock">Unlock Account</option>
              <option value="lock">Lock Account</option>
              <option value="reset-password">Reset Password</option>
            </select>
          </div>
          <div>
            <Label>Reason (Required for audit)</Label>
            <Input
              value={accountReason}
              onChange={(e) => setAccountReason(e.target.value)}
              placeholder="Reason for override"
              className="mt-1"
            />
          </div>
          <Button onClick={handleAccountOverride} disabled={loading} variant="destructive">
            {accountAction === 'unlock' ? (
              <Unlock className="w-4 h-4 mr-2" />
            ) : accountAction === 'lock' ? (
              <Lock className="w-4 h-4 mr-2" />
            ) : (
              <KeyRound className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Processing...' : ` ${accountAction.charAt(0).toUpperCase() + accountAction.slice(1)} Account`}
          </Button>
        </CardContent>
      </Card>

      {/* Policy Override */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Override Policy
          </CardTitle>
          <CardDescription>Enable or disable policy overrides</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Policy ID</Label>
            <Input
              value={policyId}
              onChange={(e) => setPolicyId(e.target.value)}
              placeholder="Enter policy ID"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Override Status</Label>
            <select
              value={policyOverride ? 'true' : 'false'}
              onChange={(e) => setPolicyOverride(e.target.value === 'true')}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="true">Enable Override</option>
              <option value="false">Disable Override</option>
            </select>
          </div>
          <div>
            <Label>Reason (Required for audit)</Label>
            <Input
              value={policyReason}
              onChange={(e) => setPolicyReason(e.target.value)}
              placeholder="Reason for override"
              className="mt-1"
            />
          </div>
          <Button onClick={handlePolicyOverride} disabled={loading} variant="destructive">
            <Shield className="w-4 h-4 mr-2" />
            {loading ? 'Processing...' : 'Override Policy'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Important Notice</p>
              <p className="text-sm text-yellow-800 mt-1">
                All override actions are logged in the audit trail. Use these functions only in emergency situations
                or when standard workflows cannot be followed. All actions require a reason for compliance and audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

