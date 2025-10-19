# Essential Guide for Mobile App Developers
**Patrick Travel - Immigration Case Management System**

> **TL;DR:** Mobile app = Web CLIENT dashboard on mobile. Same database, same API, same features.

---

## 📚 What You're Building

**The mobile app replicates the web CLIENT dashboard** with native mobile features:
- ✅ Same backend API (Next.js REST endpoints)
- ✅ Same database (PostgreSQL on Neon)
- ✅ Same Firebase (Auth + Realtime Chat)
- ✅ Same features (cases, documents, chat, notifications)
- ➕ Native mobile perks (push notifications, camera, offline mode)

### Web CLIENT Dashboard = Mobile App

| Feature | Web CLIENT | Mobile App | Notes |
|---------|------------|------------|-------|
| Login/Register | ✅ | ✅ | Same Firebase Auth |
| View My Cases | ✅ | ✅ | Same `/api/cases` |
| Upload Documents | ✅ | ✅ | + Use device camera |
| Real-time Chat | ✅ | ✅ | Same Firebase Realtime DB |
| Notifications | ✅ | ✅ | + Push notifications |
| Download Forms | ✅ | ✅ | Same templates API |
| Profile Settings | ✅ | ✅ | Same `/api/users` |

**Bottom Line:** If it works on web, it works on mobile. Just different UI, same backend.

---

## 📄 Read ONLY These 2 Essential Files

### 1️⃣ **MOBILE_CLIENT_API_GUIDE.md** (20 minutes)
📍 **Location:** `docs/MOBILE_CLIENT_API_GUIDE.md`

**Contains:** Complete API reference, authentication, all endpoints, data types, error handling, React Native examples

---

### 2️⃣ **MOBILE_APP_INTEGRATION.md** (10 minutes)
📍 **Location:** `docs/MOBILE_APP_INTEGRATION.md`

**Contains:** Firebase Realtime DB setup, real-time chat, typing indicators, presence, complete code

---

**Total Reading Time:** 30 minutes - That's all you need! 🎉

---

## 🚀 Quick Start (10 Minutes)

### 1. Get Credentials
- Firebase config (same as web app)
- API URL: `http://YOUR_IP:3000/api` (dev) or `https://domain.com/api` (prod)

### 2. Install Dependencies
```bash
# React Native/Expo
npm install firebase axios @react-native-async-storage/async-storage
```

### 3. Configure Firebase
```typescript
// config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  databaseURL: "YOUR_DATABASE_URL" // Important!
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
```

### 4. Setup API Client
```typescript
// api/client.ts
import axios from 'axios';
import { auth } from '../config/firebase';

const apiClient = axios.create({
  baseURL: 'http://192.168.1.100:3000/api', // Your local IP
  timeout: 30000,
});

// Auto-add Firebase token
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    config.headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  return config;
});

export default apiClient;
```

**Done! Start building.** ✅

---

## 📋 Features to Build (Same as Web)

| Feature | Time | API Endpoints | Notes |
|---------|------|---------------|-------|
| **Auth** | 2 days | `/api/auth/*` | Firebase Auth + sync |
| **Cases** | 2 days | `/api/cases` | List, create, view |
| **Documents** | 2 days | `/api/documents` | Upload with camera |
| **Chat** | 2 days | Firebase Realtime DB | No API, direct Firebase |
| **Notifications** | 1 day | `/api/notifications` | + Push |
| **Profile** | 1 day | `/api/users/profile` | Edit info |
| **Templates** | 1 day | `/api/templates` | Download forms |

**Total:** ~2 weeks for MVP

---

## 💬 Real-Time Chat (Copy & Paste)

```typescript
// services/chat.service.ts
import { getDatabase, ref, push, set, onValue } from 'firebase/database';
import { database } from '../config/firebase';

// Send message
export async function sendMessage(message: {
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  content: string;
}) {
  const messagesRef = ref(database, 'messages');
  const newMessageRef = push(messagesRef);
  await set(newMessageRef, { ...message, sentAt: Date.now(), isRead: false });
  return newMessageRef.key;
}

// Subscribe to messages (real-time)
export function subscribeToMessages(userId: string, callback: (messages: any[]) => void) {
  const messagesRef = ref(database, 'messages');
  return onValue(messagesRef, (snapshot) => {
    const messages: any[] = [];
    snapshot.forEach((child) => {
      const msg = child.val();
      if (msg.senderId === userId || msg.recipientId === userId) {
        messages.push({ id: child.key, ...msg });
      }
    });
    messages.sort((a, b) => a.sentAt - b.sentAt);
    callback(messages);
  });
}
```

**Usage:**
```typescript
useEffect(() => {
  const unsubscribe = subscribeToMessages(userId, setMessages);
  return unsubscribe;
}, [userId]);
```

---

## 🔌 API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sync user data
- `GET /api/auth/me` - Get profile

### Cases
- `GET /api/cases` - List my cases
- `POST /api/cases` - Create case
- `GET /api/cases/{id}` - Case details

### Documents
- `GET /api/documents?caseId={id}` - List documents
- `POST /api/documents` - Upload (multipart/form-data)

### Notifications
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/{id}` - Mark as read

### Profile
- `PATCH /api/users/profile` - Update info
- `POST /api/users/avatar` - Upload picture
- `POST /api/users/push-token` - Save push notification token
- `DELETE /api/users/push-token` - Remove push token

### Templates
- `GET /api/templates` - List forms/guides
- `GET /api/templates/{id}` - Download

**Full Reference:** `docs/MOBILE_CLIENT_API_GUIDE.md`

---

## 📝 Complete Code Examples

### 1. Authentication
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import apiClient from '../api/client';

// Login
export async function login(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await apiClient.post('/auth/login', { firebaseUid: userCredential.user.uid });
  const profile = await apiClient.get('/auth/me');
  return profile.data.data;
}
```

### 2. Fetch Cases
```typescript
const { data } = await apiClient.get('/cases?limit=50');
const cases = data.data.cases; // Array of cases
```

### 3. Upload Document
```typescript
import * as ImagePicker from 'expo-image-picker';

// Take photo
const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });

// Upload
const formData = new FormData();
formData.append('file', {
  uri: result.uri,
  name: 'document.jpg',
  type: 'image/jpeg',
} as any);
formData.append('caseId', caseId);
formData.append('documentType', 'PASSPORT');

await apiClient.post('/documents', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### 4. Infinite Scroll
```typescript
<FlatList
  data={cases}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
/>
```

---

## ✅ Testing Checklist

- [ ] Login/register works
- [ ] View my cases list
- [ ] Upload document from camera
- [ ] Send/receive chat messages
- [ ] Receive push notification
- [ ] App works on slow 3G
- [ ] Offline mode queues messages
- [ ] Token expiration redirects to login

---

## 📦 Data Types Reference

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CLIENT' | 'AGENT' | 'ADMIN';
}

interface Case {
  id: string;
  referenceNumber: string;
  serviceType: 'STUDENT_VISA' | 'WORK_PERMIT' | ...;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | ...;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

interface Document {
  id: string;
  caseId: string;
  documentType: 'PASSPORT' | 'ID_CARD' | ...;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  filePath: string;
}
```

---

## 🎯 Timeline

| Week | Focus |
|------|-------|
| Week 1 | Auth + Cases + Documents |
| Week 2 | Chat + Notifications + Profile + Testing |

**Total: 2 weeks for MVP** 🚀

---

## 📚 Documentation Map

**Essential (Read these):**
1. `docs/MOBILE_CLIENT_API_GUIDE.md` - API reference
2. `docs/MOBILE_APP_INTEGRATION.md` - Chat setup

**Optional (Reference as needed):**
- `docs/NEXTJS_API_ROUTES.md` - Technical details
- `docs/API_INTEGRATION_SUMMARY.md` - Overview
- `src/lib/firebase/chat.service.ts` - Production code

---

## 🎉 Summary

**What:** Build a mobile app that mirrors the web CLIENT dashboard

**Backend:** Already built and ready (Next.js API + PostgreSQL + Firebase)

**Your Job:** Build native mobile UI that consumes existing APIs

**Time:** 2 weeks for MVP

**Documentation:** 2 essential files (30 min reading)

**Everything else is ready. Just build the UI!** ✅

---

**Last Updated:** October 19, 2025
**Version:** 2.0.0 (Essential Guide)
**Status:** Production Ready ✅

---

## 📲 Push Notifications Setup

### Save Push Token

When the user grants push notification permission, save their token:

```typescript
import * as Notifications from 'expo-notifications';
import apiClient from '../api/client';

// Request permission
const { status } = await Notifications.requestPermissionsAsync();
if (status !== 'granted') {
  console.log('Push notifications not allowed');
  return;
}

// Get Expo push token
const tokenData = await Notifications.getExpoPushTokenAsync();
const pushToken = tokenData.data;

// Save to backend
await apiClient.post('/users/push-token', {
  token: pushToken,
  platform: Platform.OS, // 'ios' or 'android'
  deviceId: Constants.deviceId, // Optional but recommended
});
```

### Remove Push Token (on Logout)

```typescript
// Remove push token when user logs out
await apiClient.delete('/users/push-token');

// Or remove specific device token
await apiClient.delete(`/users/push-token?platform=ios&deviceId=${deviceId}`);
```

### Handle Incoming Notifications

```typescript
import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Handle notification tap
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  
  // Navigate based on notification type
  if (data.caseId) {
    navigation.navigate('CaseDetails', { id: data.caseId });
  } else if (data.chatRoomId) {
    navigation.navigate('Chat', { roomId: data.chatRoomId });
  }
});
```

### API Endpoint

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/users/push-token` | Save push token | Yes |
| DELETE | `/api/users/push-token` | Remove push token | Yes |

**Request Body (POST):**
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "deviceId": "unique-device-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Push token saved successfully"
  },
  "message": "Push token registered"
}
```


---

## 🔔 Where Push Notifications Are Processed

### Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    PUSH NOTIFICATION FLOW                         │
└──────────────────────────────────────────────────────────────────┘

Step 1: Mobile App Registers
┌─────────────┐
│ Mobile App  │
│             │ 1. Request permission
│             │ 2. Get Expo push token
│             │ 3. POST /api/users/push-token
└──────┬──────┘        │
       │               ▼
       │    ┌──────────────────────┐
       │    │  Web Backend API     │
       │    │  Saves token to DB   │
       │    │  (SystemSetting)     │
       │    └──────────────────────┘

Step 2: Backend Triggers Notification
┌─────────────────────────┐
│  Web Backend            │
│                         │
│  Event happens:         │
│  - Case status changes  │
│  - New message arrives  │
│  - Document approved    │
│                         │
│  1. Retrieve user's     │
│     push token from DB  │
│  2. Call Expo API       │
│     expo-push.service   │
└──────────┬──────────────┘
           │
           │ HTTP POST
           ▼
┌──────────────────────────┐
│  Expo Push Service       │
│  exp.host/api/v2/push    │
│                          │
│  Validates & delivers    │
│  to device via APNs/FCM  │
└──────────┬───────────────┘
           │
           │ Push via APNs (iOS) or FCM (Android)
           ▼
┌──────────────────────────┐
│  Mobile App              │
│  Receives notification   │
│  Shows alert/badge       │
│  Handles tap action      │
└──────────────────────────┘
```

### Answer: Where Is Processing Done?

**MOBILE APP:** Registers token, receives notifications, handles user interaction

**WEB BACKEND:** Triggers notifications, sends to Expo API (file: `expo-push.service.ts`)

**EXPO SERVERS:** Delivers notifications to devices via APNs (iOS) or FCM (Android)

---

### Backend Service (Already Created)

**File:** `src/lib/notifications/expo-push.service.ts`

**Functions:**
```typescript
// Send to one user
sendPushNotificationToUser(userId, {
  title: 'Case Updated',
  body: 'Your case status changed',
  data: { caseId: '123' }
});

// Send to multiple users
sendPushNotificationToUsers(userIds, notification);

// Helper functions
sendCaseUpdateNotification(userId, caseRef, status, caseId);
sendNewMessageNotification(userId, senderName, preview, chatRoomId);
sendDocumentStatusNotification(userId, documentName, status, documentId);
```

**Usage Example (in your case update logic):**
```typescript
// src/app/api/cases/[id]/status/route.ts
import { sendCaseUpdateNotification } from '@/lib/notifications/expo-push.service';

// After updating case status
await sendCaseUpdateNotification(
  case.clientId,
  case.referenceNumber,
  newStatus,
  case.id
);
```

### Mobile App Handles Notifications

```typescript
// App.tsx or useEffect in root component
import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Handle notification when app is open
Notifications.addNotificationReceivedListener(notification => {
  console.log('Notification received:', notification);
  // Update badge, show in-app alert, etc.
});

// Handle notification tap
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  
  // Navigate based on notification type
  switch (data.type) {
    case 'CASE_STATUS_UPDATE':
      navigation.navigate('CaseDetails', { id: data.caseId });
      break;
    case 'NEW_MESSAGE':
      navigation.navigate('Chat', { roomId: data.chatRoomId });
      break;
    case 'DOCUMENT_STATUS_UPDATE':
      navigation.navigate('Documents');
      break;
  }
});
```

---

### Summary

| Component | Responsibility |
|-----------|----------------|
| **Mobile App** | Register token, receive notifications, handle taps |
| **Web Backend** | Trigger events, send to Expo API |
| **Expo API** | Route to APNs/FCM, deliver to devices |

**You (mobile developer) only need to:**
1. Get push token from Expo SDK
2. Save it via `POST /api/users/push-token`
3. Handle incoming notifications
4. Navigate to appropriate screens

**Backend handles the rest automatically!** ✅

