# Email Push Notification Issue - Diagnosis & Fix

## Problem
Push tokens are registered successfully, but users are not receiving push notifications when emails arrive.

## Root Causes Identified

### ✅ Mobile App Issues (FIXED)
1. **Missing NEW_EMAIL notification handler** - The `handleNotificationNavigation` function didn't handle `NEW_EMAIL` notification type
2. **Missing email channel mapping** - Email notifications weren't assigned to a notification channel

### 🔴 Backend Issues (NEEDS FIX)
The backend email endpoints likely do NOT send push notifications when emails are sent/received.

**Required Backend Changes:**

#### 1. Email Send Endpoint (`/api/emails/send`)
**File:** `web/src/app/api/emails/send/route.ts`

**Current Behavior:**
- Sends email via SMTP ✅
- Creates notification in database ✅
- **MISSING:** Push notification to recipient ❌

**Required Fix:**
```typescript
import { sendPushNotificationToUser } from '@/lib/notifications/expo-push.service';

// After successfully sending email
await sendPushNotificationToUser(recipientId, {
  title: '📧 New Email',
  body: `New email from ${senderName}: ${subject}`,
  data: {
    type: 'NEW_EMAIL',
    messageId: message.id,
    threadId: message.threadId,
    senderId: senderId,
    senderName: senderName,
  },
  sound: 'default',
  priority: 'high',
});
```

#### 2. Email Incoming Endpoint (`/api/emails/incoming`)
**File:** `web/src/app/api/emails/incoming/route.ts`

**Current Behavior:**
- Processes incoming email replies ✅
- Creates notification in database ✅
- **MISSING:** Push notification to recipient ❌

**Required Fix:**
```typescript
import { sendPushNotificationToUser } from '@/lib/notifications/expo-push.service';

// After processing reply
// Find the original message sender (they should receive notification)
const originalMessage = await findMessageByThreadId(threadId);
if (originalMessage && originalMessage.senderId !== senderId) {
  await sendPushNotificationToUser(originalMessage.senderId, {
    title: '📧 New Reply',
    body: `New reply from ${senderName}`,
    data: {
      type: 'NEW_EMAIL',
      messageId: newMessage.id,
      threadId: threadId,
      senderId: senderId,
      senderName: senderName,
    },
    sound: 'default',
    priority: 'high',
  });
}
```

## Mobile App Changes Made ✅

### 1. Added NEW_EMAIL Navigation Handler
**File:** `lib/services/pushNotifications.ts`

```typescript
case 'NEW_EMAIL':
  if (data.messageId) {
    router.push(`/email/${data.messageId}`);
  } else if (data.caseId) {
    router.push(`/case/${data.caseId}`);
  } else {
    router.push('/(tabs)/notifications');
  }
  break;
```

### 2. Added Email Channel Mapping
**File:** `lib/services/pushNotifications.ts`

```typescript
const getChannelIdForType = (type: string): string => {
  if (type.includes('MESSAGE')) return 'messages';
  if (type.includes('EMAIL')) return 'messages'; // Use messages channel
  // ...
};
```

## Verification Steps

### 1. Verify Push Token Registration
Check logs for:
```
✅ Push notification token obtained successfully
✅ Push token registered successfully
```

### 2. Test Backend Push Notification
After backend fix, verify backend logs show:
```
Sending push notification to user {userId}
Push notification sent successfully
```

### 3. Test End-to-End
1. User A sends email to User B
2. User B should receive push notification
3. Tapping notification should open email detail screen

## Backend Requirements

The backend must:
1. ✅ Call `sendPushNotificationToUser()` when emails are sent
2. ✅ Call `sendPushNotificationToUser()` when email replies are received
3. ✅ Include proper notification data:
   - `type: 'NEW_EMAIL'`
   - `messageId`: ID of the email message
   - `threadId`: Thread ID for replies
   - `senderId`: Who sent the email
   - `senderName`: Display name of sender

## Notification Data Structure

```typescript
{
  type: 'NEW_EMAIL',
  messageId: string,        // Required for navigation
  threadId?: string,        // Optional, for threading
  senderId: string,         // Who sent it
  senderName: string,       // Display name
  caseId?: string,          // Optional, related case
}
```

## Testing Checklist

- [ ] Push token registered on login
- [ ] Backend sends push notification on email send
- [ ] Backend sends push notification on email reply
- [ ] Mobile app receives notification
- [ ] Notification shows correct title/body
- [ ] Tapping notification navigates to email detail
- [ ] Works when app is in foreground
- [ ] Works when app is in background
- [ ] Works when app is closed (cold start)

## Related Files

**Mobile:**
- `lib/services/pushNotifications.ts` - Notification handling
- `app/_layout.tsx` - Push token registration
- `stores/auth/authStore.ts` - Auth store with push token registration

**Backend (Web):**
- `src/app/api/emails/send/route.ts` - Email send endpoint
- `src/app/api/emails/incoming/route.ts` - Email reply endpoint
- `src/lib/notifications/expo-push.service.ts` - Push notification service

