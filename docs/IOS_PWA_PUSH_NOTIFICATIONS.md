# iOS PWA Push Notifications Setup Guide

This guide explains how to implement server-side push notifications for iOS PWAs that work even when the app is closed.

## Overview

The implementation includes:

- ✅ Server-side Web Push with VAPID keys
- ✅ Push subscription management
- ✅ Background notification delivery
- ✅ Routine reminder scheduling
- ✅ iOS PWA compatibility

## Quick Setup

### 1. Generate VAPID Keys

```bash
node scripts/generate-vapid-keys.js
```

Add the output to your `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

### 2. Setup Database

```bash
node scripts/setup-push-subscriptions-table.js
```

Or manually run the SQL from `database/push_subscriptions_schema.sql` in your Supabase SQL editor.

### 3. Test the System

1. Restart your dev server: `npm run dev`
2. Go to `/account` and navigate to Notification Settings
3. Enable notifications and subscribe to server push
4. Test with "Test Server Push" button

## iOS PWA Requirements

| Requirement       | Status         | Notes                                  |
| ----------------- | -------------- | -------------------------------------- |
| PWA Installation  | ✅ Required    | User must "Add to Home Screen"         |
| Standalone Mode   | ✅ Required    | Must open from home screen, not Safari |
| HTTPS             | ✅ Required    | Required in production                 |
| iOS Version       | ✅ 16.4+       | Earlier versions have limited support  |
| Web Push Protocol | ✅ Implemented | Using VAPID keys                       |
| Service Worker    | ✅ Updated     | Handles background push events         |

## Technical Implementation

### Architecture

```
User Device (iOS PWA)
    ↓ (Subscribe to Push)
Web Push Service (APNs/FCM)
    ↓ (Store Subscription)
Your Server Database
    ↓ (Send Notifications)
Web Push Service
    ↓ (Deliver to Device)
User Device (Background)
```

### Key Components

1. **Frontend (`usePushNotifications` hook)**

   - Manages push subscriptions
   - Handles VAPID key conversion
   - Stores subscription data

2. **Backend (`/api/push-notifications`)**

   - Stores/manages subscriptions
   - Sends push notifications
   - Handles expired subscriptions

3. **Scheduler (`/api/send-routine-notifications`)**

   - Checks for upcoming routines
   - Sends automated reminders
   - Respects user preferences

4. **Service Worker (`sw-notifications.js`)**
   - Handles background push events
   - Shows notifications when app is closed
   - Manages notification actions

### Database Schema

```sql
-- Push subscriptions storage
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    device_type TEXT,
    platform TEXT,
    browser TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification history tracking
ALTER TABLE notification_history
ADD COLUMN push_subscription_id UUID REFERENCES push_subscriptions(id),
ADD COLUMN delivery_method TEXT DEFAULT 'browser_api';
```

## Usage Examples

### Send Manual Push Notification

```typescript
// Using the hook
const { sendServerPushNotification } = usePushNotifications(userId);

await sendServerPushNotification({
  title: "🎉 Achievement Unlocked!",
  body: "You've completed your weekly goal!",
  data: { type: "achievement", goalId: "weekly-steps" },
  url: "/achievements",
});
```

### Send via API

```typescript
// Direct API call
const response = await fetch("/api/push-notifications?action=send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "user-uuid",
    payload: {
      title: "⏰ Routine Reminder",
      body: "Your morning routine starts in 15 minutes",
      data: { type: "routine_reminder" },
      url: "/routines",
    },
    notificationType: "routine_reminder",
  }),
});
```

### Automated Routine Notifications

Set up a cron job or scheduled task to call:

```bash
curl -X POST https://your-domain.com/api/send-routine-notifications
```

**Recommended Schedule**: Every 5-15 minutes during active hours

## Production Deployment

### Environment Variables

Add these to your production environment:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BMuhVK27l0gARZSpQyiIk...
VAPID_PRIVATE_KEY=J44GjWQtCIi3zfFVkdGwK7G...
VAPID_SUBJECT=mailto:support@yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Cron Job Setup

**Vercel** (using Vercel Cron):

```typescript
// api/cron/send-notifications.ts
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Add auth check here
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Call your notification API
  const response = await fetch(
    `${process.env.NEXTAUTH_URL}/api/send-routine-notifications`,
    {
      method: "POST",
    }
  );

  return res.json(await response.json());
}
```

**Traditional Server**:

```bash
# Add to crontab (runs every 10 minutes)
*/10 * * * * curl -X POST https://yourdomain.com/api/send-routine-notifications
```

## Troubleshooting

### Common Issues

| Issue                       | Cause                           | Fix                                      |
| --------------------------- | ------------------------------- | ---------------------------------------- |
| No notifications received   | Not installed as PWA            | "Add to Home Screen" and open from there |
| Only works when app is open | Using `showNotification()` only | Implement server push with Web Push API  |
| VAPID errors                | Missing/incorrect keys          | Regenerate keys and update environment   |
| 410/404 push errors         | Expired subscriptions           | System automatically marks as inactive   |
| iOS not working             | Safari vs PWA                   | Must use standalone PWA mode             |

### Debug Steps

1. **Check Push Subscription**:

   ```javascript
   navigator.serviceWorker.ready.then((reg) =>
     reg.pushManager
       .getSubscription()
       .then((sub) => console.log("Subscription:", sub))
   );
   ```

2. **Test Server Push**:

   - Go to `/account` → Notification Settings
   - Click "Test Server Push"
   - Check browser console for errors

3. **Check Service Worker**:

   ```javascript
   navigator.serviceWorker.ready.then((reg) => console.log("SW ready:", reg));
   ```

4. **Verify Database**:
   ```sql
   SELECT * FROM push_subscriptions WHERE user_id = 'your-user-id';
   SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 10;
   ```

### iOS-Specific Debugging

1. **Verify PWA Installation**:

   - Check if `window.navigator.standalone` is `true`
   - Verify app is in standalone mode (no Safari UI)

2. **Check iOS Version**:

   - iOS 16.4+ required for reliable push support
   - Earlier versions may have limited functionality

3. **Test Notification Permission**:
   ```javascript
   console.log("Permission:", Notification.permission);
   console.log("Push supported:", "PushManager" in window);
   ```

## Best Practices

### Performance

- ✅ Clean up expired subscriptions automatically
- ✅ Limit notification frequency (respect user preferences)
- ✅ Use notification tags to prevent spam
- ✅ Batch process routine notifications

### User Experience

- ✅ Clear onboarding for PWA installation
- ✅ Granular notification preferences
- ✅ Test notifications to verify setup
- ✅ Meaningful notification content

### Security

- ✅ Keep VAPID private key secure
- ✅ Validate user permissions server-side
- ✅ Rate limit notification sending
- ✅ Encrypt sensitive data in notifications

## API Reference

### Push Notifications API

**Subscribe to Push**

```
POST /api/push-notifications?action=subscribe
{
  "userId": "uuid",
  "subscription": { "endpoint": "...", "keys": {...} },
  "deviceInfo": { "platform": "iOS", "browser": "Safari" }
}
```

**Send Notification**

```
POST /api/push-notifications?action=send
{
  "userId": "uuid",
  "payload": {
    "title": "Notification Title",
    "body": "Notification body",
    "data": { "type": "reminder" },
    "url": "/page"
  },
  "notificationType": "routine_reminder"
}
```

**Get Subscriptions**

```
GET /api/push-notifications?action=subscriptions&userId=uuid
```

**Unsubscribe**

```
DELETE /api/push-notifications?action=unsubscribe
{
  "userId": "uuid",
  "endpoint": "subscription-endpoint"
}
```

### Routine Notifications API

**Send Routine Notifications**

```
POST /api/send-routine-notifications
```

This endpoint processes all users with routine reminders enabled and sends appropriate notifications based on their schedules and preferences.

---

## Next Steps

1. **Test thoroughly** on iOS devices with your PWA
2. **Set up monitoring** for notification delivery rates
3. **Configure cron jobs** for automated routine notifications
4. **Monitor subscription health** and clean up expired ones
5. **Gather user feedback** on notification timing and content

The system is now ready for production use with iOS PWAs! 🎉
