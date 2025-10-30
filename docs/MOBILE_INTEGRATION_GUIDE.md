# Mobile Integration Guide
**Patrick Travel Services - Complete Mobile API & Integration Documentation**

> **Version:** 2.0  
> **Last Updated:** October 20, 2025  
> **For:** React Native, Expo, Flutter, Native iOS/Android

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Firebase Setup](#firebase-setup)
4. [Authentication Flow](#authentication-flow)
5. [Data Types & Enums](#data-types--enums)
6. [API Request/Response Types](#api-requestresponse-types)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Real-Time Chat Integration](#real-time-chat-integration)
9. [Filter Reference](#filter-reference)
10. [File Uploads](#file-uploads)
11. [Push Notifications](#push-notifications)
12. [Error Handling](#error-handling)
13. [Code Examples](#code-examples)
14. [Security Best Practices](#security-best-practices)

---

## Quick Start

### What You're Building

The mobile app replicates the **web CLIENT dashboard** with native mobile features:

- ✅ Same backend API (Next.js REST endpoints)
- ✅ Same database (PostgreSQL on Neon)
- ✅ Same Firebase (Auth + Realtime Chat)
- ✅ Same features (cases, documents, chat, notifications)
- ➕ Native mobile perks (push notifications, camera, offline mode)

### 5-Minute Setup

```bash
# 1. Install Firebase SDK
npm install firebase
# or
expo install firebase

# 2. Install required dependencies
npm install @react-native-async-storage/async-storage
npm install expo-notifications  # For push notifications
```

### Essential Configuration

```typescript
// config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL, // For Realtime DB
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
```

```typescript
// config/api.ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-domain.com';

export const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    
    return response.json();
  },
};
```

---

## Architecture Overview

```
Mobile App (React Native/Expo/Flutter)
    │
    ├─► Firebase Auth (Authentication)
    │   └─► ID Token for API calls
    │
    ├─► REST API (Next.js Backend)
    │   ├─► /api/auth/* (Login, Register, Logout)
    │   ├─► /api/cases/* (CRUD operations)
    │   ├─► /api/documents/* (Upload, Download)
    │   ├─► /api/notifications/* (List, Mark as Read)
    │   └─► /api/users/* (Profile, Settings)
    │
    └─► Firebase Realtime Database (Chat)
        ├─► messages/{messageId}
        ├─► chatRooms/{roomId}
        ├─► presence/{userId}
        └─► typing/{roomId}/{userId}
```

### Key Features

- ✅ **REST API** for CRUD operations (cases, documents, notifications, users)
- ✅ **Firebase Authentication** with ID tokens
- ✅ **Real-time Chat** via Firebase Realtime Database (< 100ms latency)
- ✅ **Role-based Access Control** (CLIENT, AGENT, ADMIN)
- ✅ **File Upload** support with UploadThing
- ✅ **Offline Support** for chat messages
- ✅ **Pagination** with max 100 items per request
- ✅ **Rate Limiting** to prevent abuse
- ✅ **Push Notifications** with Expo Notifications

---

## Firebase Setup

### 1. Firebase Configuration

**Use the same Firebase project as the web app** for seamless cross-platform communication.

```typescript
// services/firebase.service.ts
import { initializeApp, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  get, 
  onValue, 
  off,
  update
} from 'firebase/database';

// Initialize Firebase (same config as web)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

let app;
try {
  app = getApp();
} catch {
  app = initializeApp(firebaseConfig);
}

export const auth = getAuth(app);
export const database = getDatabase(app);
```

### 2. Security Rules

The Firebase Realtime Database is already secured with rules. Messages are only accessible to participants:

```json
{
  "rules": {
    "messages": {
      "$messageId": {
        ".read": "auth != null && (data.child('senderId').val() === auth.uid || data.child('recipientId').val() === auth.uid)",
        ".write": "auth != null && newData.child('senderId').val() === auth.uid"
      }
    },
    "chatRooms": {
      "$roomId": {
        ".read": "auth != null && data.child('participants').child(auth.uid).val() === true",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## Authentication Flow

### User Registration

```typescript
// Step 1: Register with backend API
async function registerUser(userData: RegisterRequest) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      inviteCode: userData.inviteCode, // Optional for AGENT/ADMIN
    }),
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Registration failed');
  }

  // Step 2: Sign in to Firebase with custom token
  const userCredential = await signInWithCustomToken(auth, data.data.customToken);
  
  // Step 3: Store user data locally
  await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
  
  return {
    user: data.data.user,
    firebaseUser: userCredential.user,
  };
}
```

### User Login

```typescript
async function loginUser(email: string, password: string) {
  // Step 1: Sign in to Firebase
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
  // Step 2: Get Firebase ID token
  const idToken = await userCredential.user.getIdToken();
  
  // Step 3: Sync with backend (updates lastLogin, refreshes custom claims)
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Login failed');
  }

  // Step 4: Store user data
  await AsyncStorage.setItem('user', JSON.stringify(data.data));
  
  return data.data;
}
```

### Token Management

```typescript
// Auto-refresh Firebase token before API calls
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const tokenResult = await user.getIdTokenResult();
    const expirationTime = new Date(tokenResult.expirationTime).getTime();
    const now = Date.now();
    
    // Refresh if token expires in less than 5 minutes
    if (expirationTime - now < 5 * 60 * 1000) {
      return await user.getIdToken(true); // Force refresh
    }
    
    return await user.getIdToken();
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}
```

### Logout

```typescript
async function logoutUser() {
  const user = auth.currentUser;
  
  if (user) {
    // Step 1: Call backend logout
    try {
      const token = await user.getIdToken();
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Backend logout failed:', error);
    }
  }
  
  // Step 2: Sign out from Firebase
  await firebaseSignOut(auth);
  
  // Step 3: Clear local storage
  await AsyncStorage.removeItem('user');
}
```

---

## Data Types & Enums

### Core Enumerations

```typescript
enum Role {
  CLIENT = 'CLIENT',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN'
}

enum ServiceType {
  STUDENT_VISA = 'STUDENT_VISA',
  WORK_PERMIT = 'WORK_PERMIT',
  FAMILY_REUNIFICATION = 'FAMILY_REUNIFICATION',
  TOURIST_VISA = 'TOURIST_VISA',
  BUSINESS_VISA = 'BUSINESS_VISA',
  PERMANENT_RESIDENCY = 'PERMANENT_RESIDENCY'
}

enum CaseStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DOCUMENTS_REQUIRED = 'DOCUMENTS_REQUIRED',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED'
}

enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

enum DocumentType {
  PASSPORT = 'PASSPORT',
  ID_CARD = 'ID_CARD',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  MARRIAGE_CERTIFICATE = 'MARRIAGE_CERTIFICATE',
  DIPLOMA = 'DIPLOMA',
  EMPLOYMENT_LETTER = 'EMPLOYMENT_LETTER',
  BANK_STATEMENT = 'BANK_STATEMENT',
  PROOF_OF_RESIDENCE = 'PROOF_OF_RESIDENCE',
  PHOTO = 'PHOTO',
  OTHER = 'OTHER'
}

enum DocumentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

enum NotificationType {
  CASE_STATUS_UPDATE = 'CASE_STATUS_UPDATE',
  NEW_MESSAGE = 'NEW_MESSAGE',
  NEW_EMAIL = 'NEW_EMAIL',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  CASE_ASSIGNED = 'CASE_ASSIGNED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT'
}
```

### Core Data Models

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  profilePicture?: string | null;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Case {
  id: string;
  referenceNumber: string;
  clientId: string;
  assignedAgentId?: string | null;
  serviceType: ServiceType;
  status: CaseStatus;
  priority: Priority;
  submissionDate: Date;
  lastUpdated: Date;
  internalNotes?: string | null;
  estimatedCompletion?: Date | null;
  
  // Optional relations (when included)
  client?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  assignedAgent?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  documents?: Document[];
}

interface Document {
  id: string;
  caseId: string;
  uploadedById: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;
  status: DocumentStatus;
  uploadDate: Date;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  rejectionReason?: string | null;
}

interface Notification {
  id: string;
  userId: string;
  caseId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  actionUrl?: string | null;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Request/Response Types

### Standard Response Wrapper

All API responses follow this structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}
```

### Authentication Types

```typescript
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  inviteCode?: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    customToken: string;
  };
}

interface LoginResponse {
  success: boolean;
  data: User;
  message: string;
}
```

### Case Types

```typescript
interface CreateCaseRequest {
  serviceType: ServiceType;
  priority?: Priority;
}

interface ListCasesParams {
  status?: CaseStatus;
  serviceType?: ServiceType;
  priority?: Priority;
  userId?: string;
  page?: number;
  limit?: number;
}

interface UpdateCaseStatusRequest {
  status: CaseStatus;
  note?: string;
}
```

### Document Types

```typescript
interface CreateDocumentRequest {
  fileName: string;
  originalName?: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;
  caseId: string;
}

interface ListDocumentsParams {
  caseId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  page?: number;
  limit?: number;
}
```

### FAQ Types

```typescript
interface ListFAQsParams {
  category?: string;
  includeInactive?: boolean; // Default: false, ADMIN can see inactive
}

interface ListFAQsResponse {
  success: boolean;
  data: {
    faqs: FAQ[];
    faqsByCategory: Record<string, FAQ[]>;
    categories: string[];
    total: number;
  };
}

interface CreateFAQRequest {
  question: string;
  answer: string;
  category: string;
  order?: number;
  isActive?: boolean;
}
```

---

## API Endpoints Reference

### Base URL
```
Production: https://your-domain.com
Development: http://localhost:3000
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (sync with backend) |
| POST | `/api/auth/logout` | Logout and revoke tokens |
| GET | `/api/auth/me` | Get current user |

### Case Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cases` | List cases (with filters) |
| POST | `/api/cases` | Create new case |
| GET | `/api/cases/:id` | Get case by ID |
| PUT | `/api/cases/:id` | Update case |
| PATCH | `/api/cases/:id/status` | Update case status |

### Document Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List documents (with filters) |
| POST | `/api/documents` | Save document metadata |
| GET | `/api/documents/:id` | Get document by ID |
| PATCH | `/api/documents/:id/approve` | Approve document (AGENT/ADMIN) |
| PATCH | `/api/documents/:id/reject` | Reject document (AGENT/ADMIN) |

### Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/:id` | Mark as read |
| POST | `/api/notifications/mark-all-read` | Mark all as read |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get current user profile |
| PATCH | `/api/users/profile` | Update profile |
| POST | `/api/users/push-token` | Save push notification token |
| DELETE | `/api/users/push-token` | Remove push token |

### FAQ Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/faq` | List FAQs (public - no auth required) |
| GET | `/api/faq/:id` | Get FAQ by ID (public) |
| POST | `/api/faq` | Create new FAQ (ADMIN only) |
| PUT | `/api/faq/:id` | Update FAQ (ADMIN only) |
| DELETE | `/api/faq/:id` | Delete FAQ (ADMIN only) |

---

## Real-Time Chat Integration

### Chat Service Implementation

```typescript
// services/chat.service.ts
import { ref, push, set, get, onValue, off, update } from 'firebase/database';
import { database } from './firebase.service';

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  caseId?: string;
  subject?: string;
  content: string;
  isRead: boolean;
  readAt?: number;
  sentAt: number;
  attachments?: MessageAttachment[];
}

export interface ChatRoom {
  id?: string;
  participants: Record<string, boolean>;
  caseId?: string;
  lastMessage?: string;
  lastMessageAt?: number;
  unreadCount?: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

// Send a message
export async function sendMessage(
  message: Omit<ChatMessage, 'id' | 'sentAt' | 'isRead'>
): Promise<string> {
  const messagesRef = ref(database, 'messages');
  const newMessageRef = push(messagesRef);
  
  const messageData: ChatMessage = {
    ...message,
    sentAt: Date.now(),
    isRead: false,
  };
  
  await set(newMessageRef, messageData);
  
  // Update chat room
  await updateChatRoom(
    message.senderId,
    message.recipientId,
    message.caseId,
    message.content
  );
  
  return newMessageRef.key!;
}

// Subscribe to messages (real-time)
export function subscribeToDirectMessages(
  userId1: string,
  userId2: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesRef = ref(database, 'messages');
  
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const messages: ChatMessage[] = [];
    
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val() as ChatMessage;
      if (
        (message.senderId === userId1 && message.recipientId === userId2) ||
        (message.senderId === userId2 && message.recipientId === userId1)
      ) {
        messages.push({
          id: childSnapshot.key!,
          ...message,
        });
      }
    });
    
    callback(messages.sort((a, b) => a.sentAt - b.sentAt));
  });
  
  return () => off(messagesRef);
}

// Mark message as read
export async function markMessageAsRead(messageId: string): Promise<void> {
  const messageRef = ref(database, `messages/${messageId}`);
  await update(messageRef, {
    isRead: true,
    readAt: Date.now(),
  });
}

// Update or create chat room
async function updateChatRoom(
  userId1: string,
  userId2: string,
  caseId?: string,
  lastMessage?: string
): Promise<void> {
  const participantIds = [userId1, userId2].sort();
  const roomId = caseId || participantIds.join('_');
  
  const roomRef = ref(database, `chatRooms/${roomId}`);
  const snapshot = await get(roomRef);
  
  const now = Date.now();
  
  if (!snapshot.exists()) {
    // Create new room
    const participants: Record<string, boolean> = {};
    participantIds.forEach((id) => {
      participants[id] = true;
    });
    
    const room: ChatRoom = {
      participants,
      caseId,
      lastMessage,
      lastMessageAt: now,
      unreadCount: { [userId2]: 1 },
      createdAt: now,
      updatedAt: now,
    };
    
    await set(roomRef, room);
  } else {
    // Update existing room
    const currentUnread = snapshot.val().unreadCount || {};
    await update(roomRef, {
      lastMessage,
      lastMessageAt: now,
      updatedAt: now,
      [`unreadCount/${userId2}`]: (currentUnread[userId2] || 0) + 1,
    });
  }
}
```

### React Native Chat Component Example

```typescript
import React, { useEffect, useState } from 'react';
import { View, FlatList, TextInput, Button, Text } from 'react-native';
import { sendMessage, subscribeToDirectMessages, ChatMessage } from '../services/chat.service';
import { auth } from '../services/firebase.service';

export function ChatScreen({ recipientId, recipientName }: { recipientId: string; recipientName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const currentUser = auth.currentUser;
  
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = subscribeToDirectMessages(
      currentUser.uid,
      recipientId,
      setMessages
    );
    
    return unsubscribe;
  }, [currentUser, recipientId]);
  
  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return;
    
    try {
      await sendMessage({
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email || '',
        senderEmail: currentUser.email || '',
        recipientId,
        recipientName,
        recipientEmail: '', // You'd fetch this from your user data
        content: newMessage,
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: 'bold' }}>
              {item.senderId === currentUser?.uid ? 'You' : item.senderName}
            </Text>
            <Text>{item.content}</Text>
            <Text style={{ fontSize: 12, color: 'gray' }}>
              {new Date(item.sentAt).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />
      
      <View style={{ flexDirection: 'row', padding: 10 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, padding: 10, marginRight: 10 }}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={handleSend} />
      </View>
    </View>
  );
}
```

---

## Filter Reference

### Case Filters

| Parameter | Type | Values |
|-----------|------|--------|
| `status` | CaseStatus | `SUBMITTED`, `UNDER_REVIEW`, `DOCUMENTS_REQUIRED`, `PROCESSING`, `APPROVED`, `REJECTED`, `CLOSED` |
| `serviceType` | ServiceType | `STUDENT_VISA`, `WORK_PERMIT`, `FAMILY_REUNIFICATION`, `TOURIST_VISA`, `BUSINESS_VISA`, `PERMANENT_RESIDENCY` |
| `priority` | Priority | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10, max: 100) |

**Example:**
```
GET /api/cases?status=UNDER_REVIEW&priority=HIGH&page=1&limit=20
```

### Document Filters

| Parameter | Type | Values |
|-----------|------|--------|
| `caseId` | string | Filter by case ID |
| `type` | DocumentType | `PASSPORT`, `ID_CARD`, `BIRTH_CERTIFICATE`, etc. |
| `status` | DocumentStatus | `PENDING`, `APPROVED`, `REJECTED` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20, max: 100) |

**Example:**
```
GET /api/documents?status=PENDING&type=PASSPORT&page=1
```

### Notification Filters

| Parameter | Type | Values |
|-----------|------|--------|
| `type` | NotificationType | `CASE_STATUS_UPDATE`, `NEW_MESSAGE`, `DOCUMENT_VERIFIED`, etc. |
| `status` | string | `read`, `unread` |
| `sortBy` | string | `createdAt`, `type`, `readAt` (default: `createdAt`) |
| `sortOrder` | string | `asc`, `desc` (default: `desc`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20, max: 100) |

**Example:**
```
GET /api/notifications?status=unread&sortBy=createdAt&sortOrder=desc
```

### FAQ Filters

| Parameter | Type | Values |
|-----------|------|--------|
| `category` | string | Filter by category name |
| `includeInactive` | boolean | Include inactive FAQs (ADMIN only, default: false) |

**Example:**
```
GET /api/faq
GET /api/faq?category=Visa%20Process
GET /api/faq?includeInactive=true  // ADMIN only
```

---

## File Uploads

File uploads use **UploadThing** (not direct API upload):

### Process

1. **Upload file to UploadThing** using their SDK
2. **Receive file URL and metadata** from UploadThing
3. **Save metadata to API** using `POST /api/documents`

### React Native Example

```typescript
// 1. Upload to UploadThing
const uploadFile = async (fileUri: string, fileName: string) => {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: 'image/jpeg', // or appropriate MIME type
  } as any);
  
  const uploadResponse = await fetch('YOUR_UPLOADTHING_ENDPOINT', {
    method: 'POST',
    body: formData,
  });
  
  const uploadData = await uploadResponse.json();
  return uploadData.url; // UploadThing file URL
};

// 2. Save metadata to database
const saveDocument = async (
  fileUrl: string,
  fileName: string,
  fileSize: number,
  caseId: string,
  documentType: DocumentType
) => {
  const token = await auth.currentUser?.getIdToken();
  
  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      originalName: fileName,
      filePath: fileUrl,
      fileSize,
      mimeType: 'image/jpeg',
      documentType,
      caseId,
    }),
  });
  
  return response.json();
};
```

---

## Push Notifications

### Setup

```bash
expo install expo-notifications expo-device expo-constants
```

### Register Device Token

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return null;
  }
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }
  
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  })).data;
  
  return token;
}

// Save token to backend
async function savePushToken(token: string) {
  const firebaseToken = await auth.currentUser?.getIdToken();
  
  await fetch(`${API_BASE_URL}/api/users/push-token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS,
      deviceId: Constants.deviceId,
    }),
  });
}

// Usage
const token = await registerForPushNotifications();
if (token) {
  await savePushToken(token);
}
```

### Handle Incoming Notifications

```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  
  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });
    
    // Listen for user tapping on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Navigate to appropriate screen based on notification data
      if (data.type === 'CASE_STATUS_UPDATE') {
        navigation.navigate('CaseDetails', { caseId: data.caseId });
      } else if (data.type === 'NEW_MESSAGE') {
        navigation.navigate('Chat', { recipientId: data.senderId });
      }
    });
    
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);
}
```

---

## Error Handling

### Error Response Structure

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Handling Example

```typescript
async function fetchWithErrorHandling(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await apiClient.request(endpoint, options);
    return response;
  } catch (error: any) {
    // Handle specific error types
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      // Token expired - refresh and retry
      await refreshAuthToken();
      return apiClient.request(endpoint, options);
    } else if (error.message.includes('429')) {
      // Rate limited - wait and retry
      await new Promise(resolve => setTimeout(resolve, 60000));
      return apiClient.request(endpoint, options);
    } else if (error.message.includes('Network')) {
      // Network error - show offline message
      showToast('No internet connection');
      throw error;
    } else {
      // Generic error
      showToast(error.message || 'An error occurred');
      throw error;
    }
  }
}
```

---

## Code Examples

### Complete Case List Screen

```typescript
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { apiClient } from '../config/api';

export function CasesScreen() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  useEffect(() => {
    loadCases();
  }, [page]);
  
  const loadCases = async () => {
    try {
      setLoading(true);
      const response = await apiClient.request(
        `/api/cases?page=${page}&limit=20&status=SUBMITTED`
      );
      
      if (response.success) {
        setCases(prev => page === 1 ? response.data.cases : [...prev, ...response.data.cases]);
        setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to load cases:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };
  
  const renderCase = ({ item }: { item: Case }) => (
    <TouchableOpacity
      style={{ padding: 15, borderBottomWidth: 1, borderColor: '#ccc' }}
      onPress={() => navigation.navigate('CaseDetails', { caseId: item.id })}
    >
      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.referenceNumber}</Text>
      <Text>{item.serviceType.replace(/_/g, ' ')}</Text>
      <Text style={{ color: '#666' }}>Status: {item.status}</Text>
      <Text style={{ color: '#666' }}>Priority: {item.priority}</Text>
    </TouchableOpacity>
  );
  
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={cases}
        keyExtractor={(item) => item.id}
        renderItem={renderCase}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator /> : null}
        ListEmptyComponent={
          !loading ? <Text style={{ textAlign: 'center', padding: 20 }}>No cases found</Text> : null
        }
      />
    </View>
  );
}
```

### Create Case

```typescript
async function createCase(serviceType: ServiceType, priority: Priority = 'NORMAL') {
  try {
    const response = await apiClient.request('/api/cases', {
      method: 'POST',
      body: JSON.stringify({
        serviceType,
        priority,
      }),
    });
    
    if (response.success) {
      console.log('Case created:', response.data.case);
      return response.data.case;
    }
  } catch (error) {
    console.error('Failed to create case:', error);
    throw error;
  }
}
```

### Upload Document with Camera

```typescript
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

async function uploadDocumentFromCamera(caseId: string, documentType: DocumentType) {
  // 1. Request camera permission
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    alert('Camera permission required');
    return;
  }
  
  // 2. Take photo
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
  });
  
  if (result.canceled) return;
  
  const imageUri = result.assets[0].uri;
  const fileName = `document_${Date.now()}.jpg`;
  
  // 3. Get file info
  const fileInfo = await FileSystem.getInfoAsync(imageUri);
  const fileSize = fileInfo.size || 0;
  
  // 4. Upload to UploadThing
  const fileUrl = await uploadFile(imageUri, fileName);
  
  // 5. Save metadata to database
  const response = await saveDocument(
    fileUrl,
    fileName,
    fileSize,
    caseId,
    documentType
  );
  
  if (response.success) {
    alert('Document uploaded successfully');
  }
}
```

### Fetch and Display FAQs

```typescript
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

export function FAQScreen() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  useEffect(() => {
    loadFAQs();
  }, [selectedCategory]);
  
  const loadFAQs = async () => {
    try {
      setLoading(true);
      
      // IMPORTANT: 
      // 1. Use full URL with domain (not relative path)
      // 2. NO trailing slash after /faq
      // 3. No authentication required (public endpoint)
      const url = selectedCategory
        ? `${API_BASE_URL}/api/faq?category=${encodeURIComponent(selectedCategory)}`
        : `${API_BASE_URL}/api/faq`;  // ✅ Correct: no trailing slash
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFaqs(data.data.faqs);
        setCategories(data.data.categories);
      } else {
        throw new Error(data.error || 'Failed to load FAQs');
      }
    } catch (error) {
      console.error('Failed to load FAQs:', error);
      // Show user-friendly error
      Alert.alert('Error', 'Failed to load FAQs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderCategory = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={{
        padding: 10,
        marginRight: 10,
        borderRadius: 20,
        backgroundColor: selectedCategory === item ? '#4f46e5' : '#e5e7eb',
      }}
      onPress={() => setSelectedCategory(item === selectedCategory ? null : item)}
    >
      <Text style={{ color: selectedCategory === item ? 'white' : 'black' }}>
        {item}
      </Text>
    </TouchableOpacity>
  );
  
  const renderFAQ = ({ item }: { item: FAQ }) => {
    const isExpanded = expandedId === item.id;
    
    return (
      <TouchableOpacity
        style={{
          padding: 15,
          borderBottomWidth: 1,
          borderColor: '#e5e7eb',
          backgroundColor: isExpanded ? '#f9fafb' : 'white',
        }}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
          {item.question}
        </Text>
        {isExpanded && (
          <Text style={{ marginTop: 10, color: '#6b7280', lineHeight: 20 }}>
            {item.answer}
          </Text>
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={{ flex: 1 }}>
      {/* Category Filter */}
      <View style={{ padding: 10 }}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          renderItem={renderCategory}
          showsHorizontalScrollIndicator={false}
        />
      </View>
      
      {/* FAQ List */}
      <FlatList
        data={faqs}
        keyExtractor={(item) => item.id}
        renderItem={renderFAQ}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
              No FAQs found
            </Text>
          ) : null
        }
      />
    </View>
  );
}
```

---

## Security Best Practices

### 1. Never Store Credentials in Code
```typescript
// ❌ BAD
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Never hardcode
};

// ✅ GOOD
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
};
```

### 2. Always Validate SSL Certificates
```typescript
// ❌ BAD - Never disable SSL validation
fetch(url, { 
  agent: new https.Agent({ rejectUnauthorized: false }) 
});

// ✅ GOOD - Let the system validate certificates
fetch(url);
```

### 3. Store Tokens Securely
```typescript
import * as SecureStore from 'expo-secure-store';

// ✅ GOOD - Use secure storage
await SecureStore.setItemAsync('userToken', token);
const token = await SecureStore.getItemAsync('userToken');
```

### 4. Implement Request Timeouts
```typescript
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 30000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};
```

### 5. Handle Token Refresh
```typescript
// Automatically refresh tokens before they expire
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

async function getValidToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const tokenResult = await user.getIdTokenResult();
  const expirationTime = new Date(tokenResult.expirationTime).getTime();
  
  if (Date.now() > expirationTime - TOKEN_REFRESH_THRESHOLD) {
    return user.getIdToken(true); // Force refresh
  }
  
  return tokenResult.token;
}
```

### 6. Sanitize User Input
```typescript
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}
```

### 7. Log Errors, Not Sensitive Data
```typescript
// ❌ BAD - Logs sensitive data
console.log('Login failed:', { email, password, token });

// ✅ GOOD - Logs only error message
console.error('Login failed:', error.message);
```

### 8. Implement Offline Mode
```typescript
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache data for offline access
async function getCasesWithCache() {
  const isConnected = await NetInfo.fetch().then(state => state.isConnected);
  
  if (isConnected) {
    // Online - fetch from API
    const response = await apiClient.request('/api/cases');
    await AsyncStorage.setItem('cachedCases', JSON.stringify(response.data));
    return response.data;
  } else {
    // Offline - use cached data
    const cached = await AsyncStorage.getItem('cachedCases');
    return cached ? JSON.parse(cached) : [];
  }
}
```

### 9. Use HTTPS Only
```typescript
// ✅ Ensure production URLs use HTTPS
export const API_BASE_URL = 
  __DEV__ 
    ? 'http://localhost:3000' 
    : 'https://your-domain.com';
```

### 10. Implement Retry Logic
```typescript
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Rate Limiting

The API implements rate limiting:

| Preset | Requests per Minute |
|--------|---------------------|
| GENEROUS | 100 |
| STANDARD | 50 |
| STRICT | 20 |

### Rate Limit Headers
```http
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 48
X-RateLimit-Reset: 1697654400
```

### Handling Rate Limits
```typescript
async function handleRateLimitedRequest(endpoint: string, options: RequestInit = {}) {
  try {
    return await apiClient.request(endpoint, options);
  } catch (error: any) {
    if (error.message.includes('429')) {
      // Wait for rate limit reset
      const retryAfter = 60; // seconds
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return apiClient.request(endpoint, options);
    }
    throw error;
  }
}
```

---

## Troubleshooting Common Issues

### FAQ API Not Loading

**❌ Issue 1: Using trailing slash**
```typescript
// WRONG - Returns 404
fetch('https://your-domain.com/api/faq/')

// CORRECT
fetch('https://your-domain.com/api/faq')
```

**❌ Issue 2: Using relative URL**
```typescript
// WRONG - Doesn't work in mobile
fetch('/api/faq')

// CORRECT - Use full URL
const API_BASE_URL = 'https://your-domain.com';
fetch(`${API_BASE_URL}/api/faq`)
```

**❌ Issue 3: CORS errors in development**

If you see CORS errors:

```typescript
// Development: API allows all origins (*)
// Production: API needs MOBILE_APP_URLS environment variable

// Check your .env file:
NEXT_PUBLIC_APP_URL=https://your-domain.com
MOBILE_APP_URLS=https://your-mobile-app-url.com

// In development, CORS should work automatically
```

**✅ Solution: Correct FAQ API Call**

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000'  // or your local IP: http://192.168.1.x:3000
  : 'https://your-domain.com';

async function fetchFAQs() {
  try {
    // IMPORTANT: NO trailing slash
    const response = await fetch(`${API_BASE_URL}/api/faq`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load FAQs');
    }

    return data.data; // { faqs, faqsByCategory, categories, total }
  } catch (error) {
    console.error('Failed to fetch FAQs:', error);
    throw error;
  }
}
```

### Testing FAQ API

**Test with curl:**
```bash
# Test from terminal (should work)
curl https://your-domain.com/api/faq

# Test with category filter
curl https://your-domain.com/api/faq?category=Visa%20Process

# Expected response:
# {
#   "success": true,
#   "data": {
#     "faqs": [...],
#     "faqsByCategory": {...},
#     "categories": [...],
#     "total": 10
#   }
# }
```

**Test in mobile app:**
```typescript
// Add this to your app for debugging
useEffect(() => {
  testFaqApi();
}, []);

async function testFaqApi() {
  console.log('Testing FAQ API...');
  console.log('API_BASE_URL:', API_BASE_URL);
  
  try {
    const url = `${API_BASE_URL}/api/faq`;
    console.log('Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      console.log('✅ FAQ API working!');
      console.log('Total FAQs:', data.data.total);
      console.log('Categories:', data.data.categories);
    }
  } catch (error) {
    console.error('❌ FAQ API failed:', error);
  }
}
```

### Other Common Issues

**Issue: "Network request failed"**
- Check internet connection
- Verify API_BASE_URL is correct
- Test API with curl first
- Check if server is running

**Issue: CORS errors**
- Development: API allows all origins (`Access-Control-Allow-Origin: *`)
- Production: Add your mobile app URL to `MOBILE_APP_URLS` environment variable
- Mobile apps usually don't send Origin header, so CORS should work

**Issue: 401 Unauthorized on protected endpoints**
- Ensure you're sending Firebase ID token: `Authorization: Bearer <token>`
- Check token hasn't expired (refresh after 55 minutes)
- FAQ endpoint doesn't need auth, but cases/documents do

**Issue: Empty response `{faqs: []}`**
- No FAQs in database yet
- All FAQs are inactive
- Check admin dashboard to create/activate FAQs

### Development Setup

**For local testing with physical device:**

```typescript
// Find your computer's local IP address:
// Mac: System Preferences > Network
// Windows: ipconfig
// Linux: ifconfig

// Use local IP instead of localhost:
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:3000'  // Replace with YOUR local IP
  : 'https://your-domain.com';
```

**Ensure Next.js accepts external connections:**
```json
// package.json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0"  // Allows connections from network
  }
}
```

---

## Additional Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **UploadThing Documentation:** https://docs.uploadthing.com
- **Expo Push Notifications:** https://docs.expo.dev/push-notifications/overview/
- **React Native Documentation:** https://reactnative.dev/docs/getting-started
- **Expo Documentation:** https://docs.expo.dev/

---

## Support

For API support and questions:
- **Email:** dev@patricktravel.com
- **Slack:** #mobile-dev-support
- **Documentation Issues:** Create issue in repository

---

**Document Version:** 2.0  
**Last Updated:** October 20, 2025  
**Maintained By:** Backend Team

