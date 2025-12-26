'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { usePushNotifications } from '@/lib/use-push-notifications'
import { toast } from '@/hooks/use-toast'

export default function PushNotificationSettings() {
  const {
    permission,
    supported,
    isSubscribed,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  } = usePushNotifications()

  const handleSubscribe = async () => {
    try {
      await subscribe()
      toast({
        title: 'Push Notifications Enabled',
        description: 'You will now receive notifications even when the app is closed.',
      })
    } catch (error: any) {
      toast({
        title: 'Failed to Enable Notifications',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      })
    }
  }

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe()
      toast({
        title: 'Push Notifications Disabled',
        description: 'You will no longer receive push notifications.',
      })
    } catch (error: any) {
      toast({
        title: 'Failed to Disable Notifications',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      })
    }
  }

  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission()
      if (result === 'granted') {
        toast({
          title: 'Permission Granted',
          description: 'You can now enable push notifications.',
        })
      } else if (result === 'denied') {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to request permission.',
        variant: 'destructive',
      })
    }
  }

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Browser push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive notifications even when the app is closed. You'll be notified about leave
          approvals, rejections, and other important updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : permission === 'denied' ? (
              <XCircle className="w-5 h-5 text-red-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <div>
              <p className="font-medium">Permission Status</p>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted'
                  ? 'Notifications are allowed'
                  : permission === 'denied'
                  ? 'Notifications are blocked'
                  : 'Permission not yet requested'}
              </p>
            </div>
          </div>
          <Badge
            variant={
              permission === 'granted'
                ? 'default'
                : permission === 'denied'
                ? 'destructive'
                : 'secondary'
            }
          >
            {permission}
          </Badge>
        </div>

        {/* Subscription Status */}
        {permission === 'granted' && (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <Bell className="w-5 h-5 text-green-600" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Subscription Status</p>
                <p className="text-sm text-muted-foreground">
                  {isSubscribed
                    ? 'You are subscribed to push notifications'
                    : 'You are not subscribed to push notifications'}
                </p>
              </div>
            </div>
            <Badge variant={isSubscribed ? 'default' : 'secondary'}>
              {isSubscribed ? 'Subscribed' : 'Not Subscribed'}
            </Badge>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {permission !== 'granted' ? (
            <Button
              onClick={handleRequestPermission}
              disabled={loading || permission === 'denied'}
              className="flex-1"
            >
              {permission === 'denied'
                ? 'Enable in Browser Settings'
                : 'Request Permission'}
            </Button>
          ) : isSubscribed ? (
            <Button
              onClick={handleUnsubscribe}
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              <BellOff className="w-4 h-4 mr-2" />
              Disable Push Notifications
            </Button>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="flex-1"
            >
              <Bell className="w-4 h-4 mr-2" />
              Enable Push Notifications
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Notifications work even when the browser is closed</p>
          <p>• You can disable them anytime from this page</p>
          <p>• Requires HTTPS connection</p>
        </div>
      </CardContent>
    </Card>
  )
}

