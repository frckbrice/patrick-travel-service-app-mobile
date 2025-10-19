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
4. Firebase Service Account JSON file (e.g., `patrick-travel-agency-firebase-adminsdk-fbsvc-aa437e075c.json`)

### What You'll Set Up

This guide will walk you through:

1. ✅ **EAS Project Configuration** - Verify your Expo project is configured
2. ✅ **Android Keystore** - Required to sign your Android app
3. ✅ **FCM v1 Credentials** - Enable push notifications using Firebase Service Account
4. ✅ **iOS APNs** (Optional) - Enable iOS push notifications
5. ✅ **Build & Test** - Create a build and test push notifications

### Step 1: Expo Project Setup

1. **Verify EAS project** (already configured):
```bash
eas whoami
# Your project ID is already set in app.json: 2c78e03f-b77b-4a17-afde-9d7cd2171610
```

2. **EAS Configuration File** (`eas.json`):
   - ✅ Already created with three build profiles:
     - **development**: For testing on physical devices with development client
     - **preview**: For internal testing/staging builds
     - **production**: For production app store releases

3. **Build Profiles Overview**:
```bash
# Development builds (includes dev tools, debugging)
pnpm run build:dev:android
pnpm run build:dev:ios

# Preview builds (testing internal releases)
pnpm run build:preview:android
pnpm run build:preview:ios

# Production builds (app store ready)
pnpm run build:prod:android
pnpm run build:prod:ios
```

### Step 2: Configure EAS Credentials (Android Keystore & FCM)

This step sets up both your Android keystore and Firebase Cloud Messaging credentials through EAS.

#### Step-by-Step Credential Setup

1. **Start the credentials configuration**:
```bash
eas credentials
```

2. **Select your build profile**:
   - Choose: **`development`** (for testing)
   - Or choose the profile you're building for

3. **Set up Android Keystore** (First time only):
   - Select: **`Keystore: Manage everything needed to build your project`**
   - Select: **`Set up a new keystore`**
   - Assign a name or press Enter to use the default name
   - ✅ Keystore will be generated and stored securely by EAS

4. **Configure Push Notifications (FCM v1)**:
   - Select: **`Go back`** to return to the main credentials menu
   - Select: **`Google Service Account`**
   - Select: **`Manage your Google Service Account Key for Push Notifications (FCM V1)`**
   - Select: **`Set up a Google Service Account Key for Push Notifications (FCM V1)`**
   - When prompted, select **`yes`** to use the detected `patrick-travel-agency-firebase-adminsdk-fbsvc-aa437e075c.json` file
   - ✅ Your Firebase service account will be uploaded and configured

5. **Verify the configuration**:
   - You should see:
     - ✅ **Keystore**: Configured with fingerprints
     - ✅ **Push Notifications (FCM V1)**: Configured with your Firebase project details

6. **Exit credentials menu**:
   - Select: **`Go back`** and then **`Exit`**

#### What You'll See After Setup

```
Android Credentials     
Project                 patrick-travel-services
Application Identifier  com.patricktravel.mobile

Push Notifications (FCM V1): Google Service Account Key For FCM V1  
  Project ID      patrick-travel-agency
  Client Email    firebase-adminsdk-fbsvc@patrick-travel-agency...
  ✅ Configured

Configuration: patrick-travel-mobile-production (Default)  
Keystore  
  Type                JKS
  Key Alias           xxxxxxxxxx
  SHA256 Fingerprint  xxxxxxxxxx
  ✅ Configured
```

#### Firebase Cloud Messaging - Understanding FCM v1 vs Legacy

**Note:** Firebase has migrated from the Legacy API to FCM API v1.

##### FCM API v1 (Current Standard - What You Just Set Up)

✅ **Recommended approach** - Modern, secure OAuth 2.0 based authentication

**What you need:**
- Firebase Service Account JSON file (e.g., `patrick-travel-agency-firebase-adminsdk-fbsvc-aa437e075c.json`)
- This is the same file used for Firebase Admin SDK on your backend

**How to verify in Firebase Console:**
- Firebase Console → Project Settings → Cloud Messaging tab
- Should show: **"Firebase Cloud Messaging API (V1) - Enabled"**

##### Legacy FCM API (Deprecated - Not Recommended)

❌ **Deprecated** on 6/20/2023, stops working 6/20/2024

If you still need to use Legacy API:
1. Firebase Console → Project Settings → Cloud Messaging
2. Enable "Cloud Messaging API (Legacy)"
3. Copy the "Server Key"
4. Upload via: `eas credentials` → Android → Push Notifications (Legacy)

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

### Step 4: Build Your App

Now that credentials are configured, you can build your app. Push notifications don't work in Expo Go - you need a development or production build.

#### Start Your First Build

**For testing push notifications, use development profile:**

```bash
pnpm run build:dev:android
```

This will:
1. Use the keystore you just configured
2. Include FCM credentials for push notifications
3. Create a development APK with debugging tools
4. Take 10-20 minutes to complete

#### Other Build Options

```bash
# Development builds (best for testing)
pnpm run build:dev:android
pnpm run build:dev:ios

# Preview builds (for QA/internal testing)
pnpm run build:preview:android
pnpm run build:preview:ios

# Production builds (for app stores)
pnpm run build:prod:android
pnpm run build:prod:ios
```

#### After the Build Completes

1. **Download the APK** from the build URL provided
2. **Install on your Android device**:
   - Transfer APK to device
   - Enable "Install from Unknown Sources" in settings
   - Install the APK
3. **Or scan QR code** from the Expo dashboard to download directly on device

**Important Notes:**
- ✅ Push notifications work on physical Android devices and Android emulators with Google Play
- ❌ iOS Simulator does NOT support push notifications - must use physical iOS device
- ✅ Development builds include dev tools and can connect to Metro bundler

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


