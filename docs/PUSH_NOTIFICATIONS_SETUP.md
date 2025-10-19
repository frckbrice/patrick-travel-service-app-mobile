# Push Notifications Setup Documentation

## Overview

This document describes the push notifications system implemented using Expo Notifications with Firebase Cloud Messaging (FCM) integration for the Patrick Travel Services mobile app.

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [Setup Instructions](#setup-instructions)
4. [Notification Types](#notification-types)
5. [Implementation](#implementation)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────┐
│   Backend API   │
│   (Next.js)     │
└────────┬────────┘
         │
         │ Send notification
         ▼
┌─────────────────┐
│  Expo Push      │
│  Service        │
└────────┬────────┘
         │
         │ via FCM
         ▼
┌─────────────────┐
│  Firebase Cloud │
│  Messaging      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mobile Device  │
│  (iOS/Android)  │
└─────────────────┘
```

### Components

1. **Expo Push Service**: Handles notification delivery
2. **Firebase Cloud Messaging**: Message routing infrastructure
3. **Backend API**: Triggers notifications based on events
4. **Mobile App**: Receives and displays notifications

---

## Features

### ✅ Push Notification Types

- **Case Updates**: Status changes, assignments
- **New Messages**: Chat message alerts
- **Document Updates**: Upload, approval, rejection
- **System Announcements**: Important app-wide notifications

### ✅ Notification Channels (Android)

- **Default**: General notifications
- **Case Updates**: Case-related notifications
- **Messages**: Chat notifications (high priority)
- **Documents**: Document-related notifications

### ✅ Notification Handling

- **Foreground**: Display alert while app is open
- **Background**: Show notification in tray
- **Deep Linking**: Navigate to relevant screen on tap
- **Badge Count**: Update app icon badge
- **Sound & Vibration**: Customizable per channel

### ✅ User Permissions

- **Request on login**: Ask for notification permissions
- **Configurable**: User can enable/disable in settings
- **Graceful degradation**: App works without notifications

---

## Setup Instructions

### Prerequisites

1. Expo account and project created
2. Firebase project configured
3. EAS Build configured (for production builds)

### Step 1: Expo Project Setup

1. **Create EAS project** (if not exists):
```bash
eas init
```

2. **Get your EAS Project ID**:
```bash
eas whoami
# Then visit: https://expo.dev/accounts/[your-account]/projects/[your-project]/settings
```

3. **Add to your `.env` file**:
```bash
EAS_PROJECT_ID=your-eas-project-id
```

### Step 2: Firebase Cloud Messaging Setup

#### For Android

1. **Go to Firebase Console** → Your Project → Project Settings
2. Click **Cloud Messaging** tab
3. Under **Cloud Messaging API (Legacy)**, enable it
4. Copy the **Server Key**

5. **Add FCM Server Key to Expo**:
```bash
# Upload FCM credentials to Expo
eas credentials
# Select Android → Push Notifications → Add FCM Server Key
```

#### For iOS (APNs)

1. **Generate APNs Key** in Apple Developer Portal:
   - Go to Certificates, Identifiers & Profiles
   - Click Keys → Create a new key
   - Enable "Apple Push Notifications service (APNs)"
   - Download the .p8 key file
   - Note the Key ID and Team ID

2. **Upload to Expo**:
```bash
eas credentials
# Select iOS → Push Notifications → Upload APNs Key
```

### Step 3: App Configuration

The notification plugin is already configured in `app.config.ts`:

```typescript
plugins: [
  'expo-router',
  [
    'expo-notifications',
    {
      icon: './assets/icon.png',
      color: '#0066CC',
      sounds: ['./assets/notification.wav'],
    },
  ],
],
```

### Step 4: Build Configuration

For push notifications to work, you need to create a production build:

```bash
# Build for development
eas build --profile development --platform android
eas build --profile development --platform ios

# Build for production
eas build --profile production --platform android
eas build --profile production --platform ios
```

---

## Notification Types

### Notification Data Structure

```typescript
interface NotificationData {
  type: NotificationType;
  caseId?: string;
  documentId?: string;
  messageId?: string;
  url?: string;
}

enum NotificationType {
  CASE_STATUS_UPDATE = 'CASE_STATUS_UPDATE',
  CASE_ASSIGNED = 'CASE_ASSIGNED',
  NEW_MESSAGE = 'NEW_MESSAGE',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}
```

### Case Status Update

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "Case Status Updated",
  "body": "Your case #PTS-2025-001234 is now under review",
  "data": {
    "type": "CASE_STATUS_UPDATE",
    "caseId": "case-uuid",
    "url": "/case/case-uuid"
  },
  "priority": "high",
  "channelId": "case-updates"
}
```

### New Message

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "New Message",
  "body": "Agent Smith: Your documents have been received",
  "data": {
    "type": "NEW_MESSAGE",
    "caseId": "case-uuid",
    "messageId": "message-uuid",
    "url": "/message/case-uuid"
  },
  "priority": "high",
  "channelId": "messages"
}
```

### Document Status

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "sound": "default",
  "title": "Document Verified",
  "body": "Your passport has been verified successfully",
  "data": {
    "type": "DOCUMENT_VERIFIED",
    "documentId": "doc-uuid",
    "caseId": "case-uuid",
    "url": "/document/doc-uuid"
  },
  "priority": "default",
  "channelId": "documents"
}
```

---

## Implementation

### Registering for Push Notifications

```typescript
import { registerForPushNotifications } from '../lib/services/pushNotifications';
import { authApi } from '../lib/api/auth.api';

// After user logs in
const tokenData = await registerForPushNotifications();

if (tokenData) {
  // Send token to backend
  await authApi.updatePushToken(tokenData.token);
}
```

### Handling Notifications

#### In Root Layout (`app/_layout.tsx`)

```typescript
import { 
  setupNotificationListeners, 
  getLastNotificationResponse 
} from '../lib/services/pushNotifications';

useEffect(() => {
  // Setup listeners
  const cleanup = setupNotificationListeners();

  // Check for cold start notification
  getLastNotificationResponse().then((data) => {
    if (data) {
      handleNotificationNavigation(data);
    }
  });

  return cleanup;
}, []);
```

#### Notification Navigation

```typescript
import { handleNotificationNavigation } from '../lib/services/pushNotifications';
import { router } from 'expo-router';

// Automatically navigates based on notification type
handleNotificationNavigation({
  type: 'CASE_STATUS_UPDATE',
  caseId: 'case-uuid',
});
// → Navigates to /case/case-uuid
```

### Sending Notifications from Backend

```typescript
// Backend API (Node.js/Next.js)
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data: any
) {
  const messages = [{
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
  }];

  const chunks = expo.chunkPushNotifications(messages);
  
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}

// Usage
await sendPushNotification(
  user.pushToken,
  'Case Updated',
  'Your case status has changed',
  {
    type: 'CASE_STATUS_UPDATE',
    caseId: case.id,
  }
);
```

### Local Notifications

```typescript
import { scheduleLocalNotification } from '../lib/services/pushNotifications';

// Schedule a notification
await scheduleLocalNotification(
  'Reminder',
  'Don\'t forget to upload your documents',
  { type: 'SYSTEM_ANNOUNCEMENT' },
  { seconds: 60 } // Show in 60 seconds
);
```

### Badge Management

```typescript
import { setBadgeCount, clearBadge } from '../lib/services/pushNotifications';

// Set badge count
await setBadgeCount(5); // Show "5" on app icon

// Clear badge
await clearBadge(); // Remove badge
```

---

## Testing

### Testing on Physical Device

1. **Build and install app** on physical device:
```bash
eas build --profile development --platform android
# Or
eas build --profile development --platform ios
```

2. **Allow notification permissions** when prompted

3. **Get push token**:
```typescript
// Token is logged when user logs in
console.log('Push token:', user.pushToken);
```

4. **Send test notification** using Expo's push tool:
   - Go to https://expo.dev/notifications
   - Paste your push token
   - Enter title and message
   - Click "Send a Notification"

### Testing from Backend

```bash
# Using cURL
curl -X POST "https://exp.host/--/api/v2/push/send" \
  -H "accept: application/json" \
  -H "accept-encoding: gzip, deflate" \
  -H "content-type: application/json" \
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxx]",
    "title": "Test Notification",
    "body": "This is a test notification",
    "data": { "type": "SYSTEM_ANNOUNCEMENT" }
  }'
```

### Testing Notification Navigation

1. Send notification with specific data
2. Tap notification
3. Verify app navigates to correct screen
4. Check notification data is passed correctly

---

## Troubleshooting

### Common Issues

**Issue: Not receiving notifications**

- Verify push token is being sent to backend
- Check device has internet connection
- Ensure app has notification permissions
- Verify EAS project ID is correct
- Check backend is sending to correct push token

**Issue: Notifications work in development but not production**

- Ensure production build is created with `eas build`
- Verify FCM credentials are uploaded to Expo
- Check APNs key is valid and uploaded (iOS)
- Verify bundle identifier matches in all configs

**Issue: Deep linking not working**

- Check notification data includes correct `type` field
- Verify navigation handlers are set up correctly
- Ensure routes exist in app routing

**Issue: Badge count not updating**

- Call `clearBadge()` when user opens app
- Check device permissions for badges
- Verify badge updates are called after state changes

**Issue: Cannot register for notifications on iOS Simulator**

- Push notifications don't work on simulators
- Must test on physical iOS device
- Android emulators work with FCM

---

## Notification Channels (Android)

Notification channels allow users to customize notification behavior per type.

### Default Channels

1. **Default** (`default`)
   - General notifications
   - Importance: MAX
   - Sound: Default
   - Vibration: On

2. **Case Updates** (`case-updates`)
   - Case status changes, assignments
   - Importance: HIGH
   - Sound: Default
   - Vibration: On

3. **Messages** (`messages`)
   - Chat messages
   - Importance: MAX
   - Sound: Default
   - Vibration: On
   - Shows on lock screen

4. **Documents** (`documents`)
   - Document upload/verification
   - Importance: DEFAULT
   - Sound: Default
   - Vibration: On

Users can customize these channels in:
**Settings → Apps → Patrick Travel → Notifications**

---

## Best Practices

1. **Always check permissions** before registering for notifications
2. **Handle token refresh** when it changes
3. **Update backend** with latest push token on each login
4. **Clear notifications** when user navigates to related screen
5. **Test on physical devices**, not just simulators
6. **Respect user preferences** for notification types
7. **Provide opt-out** mechanism in app settings
8. **Use appropriate priority** for each notification type
9. **Keep notification content** concise and actionable
10. **Log notification events** for debugging

---

## User Settings

Allow users to control notifications in app settings:

```typescript
interface NotificationSettings {
  enabled: boolean;
  caseUpdates: boolean;
  newMessages: boolean;
  documentUpdates: boolean;
  systemAnnouncements: boolean;
}

// Save to backend
await userApi.updateSettings({
  notifications: {
    enabled: true,
    caseUpdates: true,
    newMessages: true,
    documentUpdates: false,
    systemAnnouncements: true,
  },
});
```

---

## Metrics to Track

1. **Notification Delivery Rate**: % of notifications successfully delivered
2. **Open Rate**: % of notifications tapped by users
3. **Permission Grant Rate**: % of users who allow notifications
4. **Opt-out Rate**: % of users who disable notifications
5. **Notification Response Time**: Time from send to user action

---

## Security Considerations

1. **Never include sensitive data** in notification body
2. **Validate notification data** before navigation
3. **Use HTTPS** for all API calls
4. **Rotate FCM credentials** periodically
5. **Implement rate limiting** to prevent spam
6. **Log notification events** for audit trail

---

## Next Steps

- [ ] Implement notification preferences screen
- [ ] Add notification history/inbox
- [ ] Implement notification grouping
- [ ] Add rich notifications with images
- [ ] Implement notification actions (reply, mark as read)
- [ ] Add notification scheduling
- [ ] Implement notification categories
- [ ] Add analytics tracking

---

**Last Updated:** October 19, 2025  
**Version:** 1.0.0  
**Author:** Senior Mobile Developer


