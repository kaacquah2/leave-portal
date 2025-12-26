# Push Notifications Setup Guide

**Status**: Foundation Complete - Requires Database Schema Update

---

## Current Status

✅ **Service Worker**: Implemented (`public/sw.js`)  
✅ **React Hook**: Implemented (`lib/use-push-notifications.ts`)  
✅ **API Endpoints**: Created (`/api/push/subscribe`, `/api/push/unsubscribe`)  
✅ **UI Component**: Created (`components/push-notification-settings.tsx`)  
⚠️ **Database Storage**: Needs schema update  
⚠️ **VAPID Keys**: Need to be generated  

---

## Step 1: Update Database Schema

Add push subscription storage to your Prisma schema. Choose one option:

### Option A: Add to User Model (Simplest)

```prisma
model User {
  // ... existing fields
  pushSubscription String? // JSON string of subscription data
}
```

### Option B: Separate PushSubscription Table (Recommended)

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String   @unique
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

model User {
  // ... existing fields
  pushSubscription PushSubscription?
}
```

### Run Migration

```bash
npx prisma migrate dev --name add_push_subscriptions
npx prisma generate
```

---

## Step 2: Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for push notifications.

### Install web-push

```bash
npm install web-push
```

### Generate Keys

```bash
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: <your-public-key>
Private Key: <your-private-key>
```

### Add to Environment Variables

Add to `.env`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:your-email@example.com
```

**Important**: 
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser
- Never commit private keys to version control
- Use different keys for development and production

---

## Step 3: Update API Routes

After updating the schema, update the API routes:

### Update `app/api/push/subscribe/route.ts`

If using Option A (User model):
```typescript
await prisma.user.update({
  where: { id: user.id },
  data: {
    pushSubscription: JSON.stringify({
      endpoint,
      keys,
      createdAt: new Date().toISOString(),
    }),
  },
})
```

If using Option B (Separate table):
```typescript
await prisma.pushSubscription.upsert({
  where: { userId: user.id },
  update: {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  },
  create: {
    userId: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  },
})
```

### Update `app/api/push/unsubscribe/route.ts`

If using Option A:
```typescript
await prisma.user.update({
  where: { id: user.id },
  data: { pushSubscription: null },
})
```

If using Option B:
```typescript
await prisma.pushSubscription.deleteMany({
  where: { userId: user.id, endpoint },
})
```

---

## Step 4: Create Push Sending Utility

Create `lib/send-push-notification.ts`:

```typescript
import webpush from 'web-push'
import { prisma } from './prisma'

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushNotificationPayload {
  title: string
  message: string
  link?: string
  id?: string
  type?: string
  important?: boolean
}

export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
) {
  try {
    // Get user's subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushSubscription: true }, // Adjust based on your schema
    })

    if (!user?.pushSubscription) {
      console.log('User has no push subscription')
      return
    }

    // Parse subscription (if stored as JSON string)
    const subscription = typeof user.pushSubscription === 'string'
      ? JSON.parse(user.pushSubscription)
      : user.pushSubscription

    // Send notification
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload)
    )

    console.log('Push notification sent successfully')
  } catch (error: any) {
    console.error('Error sending push notification:', error)
    
    // Handle expired subscriptions
    if (error.statusCode === 410) {
      // Subscription expired, remove it
      await prisma.user.update({
        where: { id: userId },
        data: { pushSubscription: null },
      })
    }
  }
}
```

---

## Step 5: Integrate with Notification System

Update notification creation to also send push:

```typescript
// In your leave approval handler
import { sendPushNotification } from '@/lib/send-push-notification'

// After creating notification
await sendPushNotification(userId, {
  title: 'Leave Request Approved',
  message: `Your ${leaveType} leave request has been approved`,
  link: `/leaves/${leaveId}`,
  id: notificationId,
  type: 'leave_approved',
  important: true,
})
```

---

## Step 6: Test

1. **Register Service Worker**:
   - Open app in browser
   - Check console for "Service Worker registered"

2. **Request Permission**:
   - Go to Admin → System Settings → Push Notifications
   - Click "Request Permission"
   - Allow notifications

3. **Subscribe**:
   - Click "Enable Push Notifications"
   - Verify subscription saved

4. **Send Test Notification**:
   - Use browser DevTools → Application → Service Workers
   - Or create a test endpoint to send notification

---

## Troubleshooting

### Service Worker Not Registering
- Ensure `public/sw.js` exists
- Check browser console for errors
- Verify HTTPS (or localhost for development)

### Permission Denied
- User must allow notifications in browser settings
- Some browsers require user interaction before requesting permission

### Subscription Fails
- Verify VAPID keys are set correctly
- Check that keys match between client and server
- Ensure `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is accessible in browser

### Notifications Not Received
- Check service worker is active
- Verify subscription is saved in database
- Check browser notification settings
- Test with browser DevTools

---

## Production Checklist

- [ ] Generate production VAPID keys
- [ ] Add VAPID keys to production environment
- [ ] Update database schema
- [ ] Run migrations
- [ ] Update API routes with proper storage
- [ ] Test end-to-end
- [ ] Set up monitoring for failed notifications
- [ ] Document for users

---

## Security Notes

- ✅ VAPID keys authenticate your server
- ✅ Subscriptions are user-specific
- ✅ HTTPS required (except localhost)
- ✅ Never expose private key
- ✅ Validate subscription data

---

**Last Updated**: 2024

