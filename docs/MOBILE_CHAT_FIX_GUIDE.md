# Mobile Chat Firebase Permission Fix Guide

## 🚨 Quick Fix (TL;DR)

Use **Firebase UIDs** (not PostgreSQL IDs) for `senderId` and `recipientId`.

```typescript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const firebaseUid = auth.currentUser?.uid; // ✅ Firebase UID

// ❌ WRONG: PostgreSQL UUID (has dashes)
senderId: user.id // "037ffca8-1ae5-4680..."

// ✅ CORRECT: Firebase UID (no dashes)
senderId: firebaseUid // "faca6514e632ce7a..."
```

---

## Problem
The mobile app is getting `PERMISSION_DENIED` errors when trying to send chat messages to Firebase Realtime Database.

**Error:**
```
ERROR [2025-10-29T21:11:58.397Z] [ERROR] Failed to send message 
[Error: PERMISSION_DENIED: Permission denied]
```

## Root Cause
The Firebase security rules require `senderId` and `recipientId` to be **Firebase UIDs** (not PostgreSQL IDs), but the mobile client is likely sending PostgreSQL UUIDs or not passing the correct IDs.

## Firebase Security Rules
The rules in `firebase-database.rules.json` check:
```json
"messages": {
  "$messageId": {
    ".write": "auth != null && newData.child('senderId').val() == auth.uid"
  }
}
```

This means:
- `auth.uid` = Firebase authenticated user UID
- `senderId` in message = Must match `auth.uid` exactly

## Solution for Mobile Team

### 1. Get Firebase UID from Authenticated User

**Critical:** Always use the Firebase authenticated user's UID, not the PostgreSQL user ID.

```typescript
import { getAuth } from 'firebase/auth';

// ✅ CORRECT: Get Firebase UID
const auth = getAuth();
const currentUser = auth.currentUser;
const firebaseUid = currentUser?.uid; // This is what you need

// ❌ WRONG: Don't use PostgreSQL ID
const postgresUserId = user.id; // This will cause PERMISSION_DENIED
```

### 2. Send Message with Correct senderId

When calling the `sendMessage` function:

```typescript
import { sendMessage } from '@/lib/firebase/chat.service';

// ✅ CORRECT: Use Firebase UID as senderId
const result = await sendMessage({
  senderId: auth.currentUser?.uid, // Firebase UID - REQUIRED
  senderName: user.displayName || `${user.firstName} ${user.lastName}`,
  senderEmail: auth.currentUser?.email || user.email,
  recipientId: recipientFirebaseUid, // Must also be Firebase UID
  recipientName: recipientName,
  recipientEmail: recipientEmail,
  content: messageContent,
  caseId: caseId, // Optional but recommended
  senderRole: user.role, // 'AGENT' or 'CLIENT'
});

// ❌ WRONG: Using PostgreSQL ID
const result = await sendMessage({
  senderId: user.id, // This is PostgreSQL UUID - will fail!
  // ...
});
```

### 3. Ensure recipientId is Also a Firebase UID

**Important:** The `recipientId` must also be a Firebase UID, not a PostgreSQL ID.

```typescript
// ✅ CORRECT: Get recipient Firebase UID
const recipientFirebaseUid = recipient.firebaseId; // Firebase UID from backend

// ❌ WRONG: Using PostgreSQL ID
const recipientId = recipient.id; // PostgreSQL UUID - will fail security rules
```

### 4. Complete Implementation Example

```typescript
import { getAuth } from 'firebase/auth';
import { sendMessage } from '@/lib/firebase/chat.service';

async function sendChatMessage(
  messageContent: string,
  recipientUser: RecipientUser,
  caseId: string
) {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  // ✅ Get Firebase UIDs (not PostgreSQL IDs)
  const senderId = currentUser.uid; // Firebase UID
  const recipientId = recipientUser.firebaseId; // Must be Firebase UID, not PostgreSQL ID

  // ✅ Call sendMessage with Firebase UIDs
  try {
    const messageId = await sendMessage({
      senderId: senderId, // Firebase UID
      senderName: currentUser.displayName || 'User',
      senderEmail: currentUser.email || '',
      recipientId: recipientId, // Firebase UID
      recipientName: recipientUser.name,
      recipientEmail: recipientUser.email,
      content: messageContent,
      caseId: caseId,
      senderRole: getCurrentUserRole(), // 'AGENT' or 'CLIENT'
    });

    return messageId;
  } catch (error: any) {
    console.error('Failed to send message:', error.message);
    
    // Check if it's a permission error
    if (error.code === 'PERMISSION_DENIED') {
      console.error('PERMISSION_DENIED: Check that senderId and recipientId are Firebase UIDs');
      console.error('senderId:', senderId);
      console.error('recipientId:', recipientId);
      console.error('auth.uid:', currentUser.uid);
    }
    
    throw error;
  }
}
```

### 5. Debugging Checklist

If you still get `PERMISSION_DENIED` errors, check:

- [ ] Are you using `auth.currentUser.uid` (Firebase UID) as `senderId`?
- [ ] Is `recipientId` a Firebase UID, not a PostgreSQL UUID?
- [ ] Does your user object have the `firebaseId` field populated?
- [ ] Are you authenticated with Firebase (not just your app auth)?
- [ ] Does the `senderId` in the message exactly match `auth.uid`?

### 6. How to Verify Firebase UID vs PostgreSQL ID

```typescript
// ✅ Firebase UID format (28 characters)
const firebaseUid = "faca6514e632ce7a12345678"; // All lowercase, no dashes

// ❌ PostgreSQL UUID format (36 characters with dashes)
const postgresId = "037ffca8-1ae5-4680-9a3e-5f7b8c9d0e1f"; // Has dashes
```

### 7. Backend Reference (Web Implementation)

The web app handles this correctly. See `src/features/messages/api/mutations.ts`:

```typescript
// Get Firebase UID from authenticated Firebase user
const firebaseUid = auth.currentUser!.uid;

// Use Firebase UID for Firebase operations (required by security rules)
const senderId = data.senderId || firebaseUid;

// Call sendMessage with Firebase UID
const sendResult = await sendMessage({
  senderId, // Firebase UID
  senderName,
  senderEmail,
  recipientId: data.recipientId, // Must also be Firebase UID
  // ...
});
```

## Summary

**Key Point:** Firebase Realtime Database security rules compare `auth.uid` (Firebase UID) with the `senderId` field in your message. These must match exactly.

**Fix:** Always use `auth.currentUser.uid` (Firebase UID) as `senderId`, and ensure `recipientId` is also a Firebase UID from the user's `firebaseId` field.

**Files to Update in Mobile App:**
1. Message sending function
2. User data model (ensure it includes `firebaseId` field)
3. Recipient user lookup (use `firebaseId`, not PostgreSQL `id`)

**Quick ID Format Check:**
- Firebase UID: `faca6514e632ce7a12345678` (28 chars, no dashes)
- PostgreSQL UUID: `037ffca8-1ae5-4680-9a3e-5f7b8c9d0e1f` (36 chars, with dashes)

## Need Help?

If the issue persists after these changes, check:
1. Firebase authentication state
2. Database rules deployment: `firebase deploy --only database`
3. Server logs for ID mismatches
