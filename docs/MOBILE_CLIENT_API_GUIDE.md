# Mobile Client API Integration Guide
**Patrick Travel Services - Immigration Case Management System**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Configuration](#api-configuration)
5. [Data Types & Enums](#data-types--enums)
6. [REST API Endpoints](#rest-api-endpoints)
7. [Real-Time Chat Integration](#real-time-chat-integration)
8. [Error Handling](#error-handling)
9. [Pagination & Limits](#pagination--limits)
10. [Rate Limiting](#rate-limiting)
11. [File Uploads](#file-uploads)
12. [Code Examples](#code-examples)

---

## Overview

This guide provides everything you need to build a mobile client (React Native/Expo, Flutter, or native iOS/Android) that consumes the Patrick Travel Services API.

### Architecture

```
Mobile App (React Native/Expo)
    │
    ├─► Firebase Auth (Authentication)
    │
    ├─► REST API (Next.js Backend)
    │   └─► PostgreSQL (Neon) - Persistent Storage
    │
    └─► Firebase Realtime Database (Real-time Chat)
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

---

## Getting Started

### Prerequisites

1. **Firebase Project Credentials** (same as web app)
2. **API Base URL** (development or production)
3. **Mobile SDK**: React Native, Flutter, iOS, or Android

### Quick Setup (5 minutes)

1. Install Firebase SDK
2. Configure Firebase with project credentials
3. Set up API client with base URL
4. Implement authentication flow
5. Start making API calls

---

## Authentication

### Flow

```
1. User registers/logs in → Firebase Auth
2. Get Firebase ID token
3. Send token with every API request
4. Token auto-refreshes via Firebase SDK
```

### Firebase Configuration

```typescript
// config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "YOUR_DATABASE_URL" // Required for Realtime Database
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
```

### Registration Flow

```typescript
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import apiClient from './api-client';

// 1. Register with Firebase
const userCredential = await createUserWithEmailAndPassword(
  auth,
  email,
  password
);

// 2. Sync with backend (creates user in PostgreSQL)
const response = await apiClient.post('/auth/register', {
  email,
  password,
  firstName,
  lastName,
  phone
});

// User is now registered in both Firebase and PostgreSQL
```

### Login Flow

```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';

// 1. Sign in with Firebase
const userCredential = await signInWithEmailAndPassword(
  auth,
  email,
  password
);

// 2. Get ID token (automatically included in API requests)
const idToken = await userCredential.user.getIdToken();

// 3. Sync with backend
await apiClient.post('/auth/login', {
  firebaseUid: userCredential.user.uid
});
```

### Authorization Header

**All protected endpoints require:**

```
Authorization: Bearer <firebase-id-token>
```

---

## API Configuration

### Base URLs

**Development:**
```
http://localhost:3000/api
http://192.168.x.x:3000/api  (Your local network IP)
```

**Production:**
```
https://your-production-domain.com/api
```

### Environment Setup

```typescript
// config/api.ts
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:3000/api'  // Change to your local IP
  : 'https://api.patricktravel.com/api';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000, // 30 seconds
};
```

### Axios Client Setup

```typescript
// api/client.ts
import axios from 'axios';
import { auth } from '../config/firebase';
import { API_CONFIG } from '../config/api';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add Firebase token
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - sign out user
      await auth.signOut();
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Data Types & Enums

### User Roles

```typescript
enum Role {
  CLIENT = 'CLIENT',    // End users applying for services
  AGENT = 'AGENT',      // Staff handling cases
  ADMIN = 'ADMIN'       // System administrators
}
```

### Service Types

```typescript
enum ServiceType {
  STUDENT_VISA = 'STUDENT_VISA',
  WORK_PERMIT = 'WORK_PERMIT',
  FAMILY_REUNIFICATION = 'FAMILY_REUNIFICATION',
  TOURIST_VISA = 'TOURIST_VISA',
  BUSINESS_VISA = 'BUSINESS_VISA',
  PERMANENT_RESIDENCY = 'PERMANENT_RESIDENCY'
}
```

### Case Status

```typescript
enum CaseStatus {
  SUBMITTED = 'SUBMITTED',              // Just submitted
  UNDER_REVIEW = 'UNDER_REVIEW',        // Agent reviewing
  DOCUMENTS_REQUIRED = 'DOCUMENTS_REQUIRED', // Waiting for docs
  PROCESSING = 'PROCESSING',            // In progress
  APPROVED = 'APPROVED',                // Completed successfully
  REJECTED = 'REJECTED',                // Denied
  CLOSED = 'CLOSED'                     // Archived
}
```

### Priority Levels

```typescript
enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}
```

### Document Types

```typescript
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
```

### Document Status

```typescript
enum DocumentStatus {
  PENDING = 'PENDING',      // Awaiting review
  APPROVED = 'APPROVED',    // Accepted by agent
  REJECTED = 'REJECTED'     // Rejected with reason
}
```

### Notification Types

```typescript
enum NotificationType {
  CASE_STATUS_UPDATE = 'CASE_STATUS_UPDATE',
  NEW_MESSAGE = 'NEW_MESSAGE',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  CASE_ASSIGNED = 'CASE_ASSIGNED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT'
}
```

### Core Interfaces

```typescript
// User
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

// Case
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
}

// Document
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

// Notification
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

// Message Attachment
interface MessageAttachment {
  id?: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt?: string;
}
```

### API Response Formats

```typescript
// Standard Response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Paginated Response
interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
}
```

---

## REST API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}

Response 201:
{
  "success": true,
  "data": {
    "user": {
      "id": "firebase-uid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CLIENT",
      "isActive": true
    },
    "customToken": "firebase-custom-token"
  }
}
```

#### Login (Sync User Data)
```http
POST /api/auth/login
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "firebaseUid": "firebase-user-id"
}

Response 200:
{
  "success": true,
  "data": {
    "user": { ... },
    "message": "Login successful"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <firebase-token>

Response 200:
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CLIENT",
    ...
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <firebase-token>

Response 200:
{
  "success": true,
  "message": "Logout successful"
}
```

---

### Cases

#### List Cases
```http
GET /api/cases?page=1&limit=20&status=SUBMITTED&search=john
Authorization: Bearer <firebase-token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 10, max: 100)
- status: CaseStatus (optional)
- search: string (optional)

Response 200:
{
  "success": true,
  "data": {
    "cases": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasMore": true
    }
  }
}
```

#### Create Case
```http
POST /api/cases
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "serviceType": "STUDENT_VISA",
  "priority": "NORMAL",
  "notes": "Applying for student visa to Canada"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "case-id",
    "referenceNumber": "PTS-2025-001234",
    "status": "SUBMITTED",
    ...
  }
}
```

#### Get Case Details
```http
GET /api/cases/{caseId}
Authorization: Bearer <firebase-token>

Response 200:
{
  "success": true,
  "data": {
    "id": "case-id",
    "referenceNumber": "PTS-2025-001234",
    "status": "UNDER_REVIEW",
    "client": { ... },
    "assignedAgent": { ... },
    "documents": [...],
    ...
  }
}
```

#### Update Case Status (AGENT/ADMIN only)
```http
PATCH /api/cases/{caseId}/status
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "status": "PROCESSING",
  "notes": "Started processing documents"
}

Response 200:
{
  "success": true,
  "data": { ... }
}
```

---

### Documents

#### List Documents
```http
GET /api/documents?caseId={caseId}&status=PENDING&page=1&limit=20
Authorization: Bearer <firebase-token>

Query Parameters:
- caseId: string (optional, filter by case)
- status: DocumentStatus (optional)
- type: DocumentType (optional)
- page: number
- limit: number (max: 100)

Response 200:
{
  "success": true,
  "data": {
    "documents": [...],
    "pagination": { ... }
  }
}
```

#### Upload Document
```http
POST /api/documents
Authorization: Bearer <firebase-token>
Content-Type: multipart/form-data

FormData:
- file: File
- caseId: string
- documentType: DocumentType
- description: string (optional)

Response 201:
{
  "success": true,
  "data": {
    "id": "doc-id",
    "fileName": "passport.pdf",
    "documentType": "PASSPORT",
    "status": "PENDING",
    "filePath": "https://...",
    ...
  }
}
```

#### Get Document Details
```http
GET /api/documents/{documentId}
Authorization: Bearer <firebase-token>

Response 200:
{
  "success": true,
  "data": {
    "id": "doc-id",
    "fileName": "passport.pdf",
    "status": "APPROVED",
    ...
  }
}
```

#### Delete Document
```http
DELETE /api/documents/{documentId}
Authorization: Bearer <firebase-token>

Response 200:
{
  "success": true,
  "message": "Document deleted successfully"
}
```

#### 💡 UX Best Practice: Case Selection for Upload

**Important:** When implementing document upload in your mobile app, **DO NOT** ask users to manually enter a case ID. Instead, provide a user-friendly case selector.

**❌ Bad UX (Don't do this):**
```tsx
<TextInput
  placeholder="Enter case ID"
  value={caseId}
  onChangeText={setCaseId}
/>
```

**✅ Good UX (Do this):**

```tsx
// 1. Fetch user's cases
const { data: casesData, isLoading } = useQuery({
  queryKey: ['cases'],
  queryFn: async () => {
    const response = await apiClient.get('/cases?limit=100');
    return response.data.data.cases;
  },
});

// 2. Show case picker with readable information
<Picker
  selectedValue={caseId}
  onValueChange={setCaseId}
  enabled={!isLoading}
>
  <Picker.Item label="Choose a case..." value="" />
  {casesData?.map(caseItem => (
    <Picker.Item
      key={caseItem.id}
      label={`${caseItem.referenceNumber} - ${getServiceTypeLabel(caseItem.serviceType)}`}
      value={caseItem.id}  // UUID passed to API
    />
  ))}
</Picker>
```

**Why this matters:**
- ✅ Users see friendly case reference numbers (e.g., "PTS-2025-001234")
- ✅ Shows context (service type and status)
- ✅ Prevents typing errors
- ✅ UUID is used behind the scenes in API call
- ✅ Consistent with web app UX

**Example case display:**
```
PTS-2025-001234 - Student Visa
PTS-2025-001567 - Work Permit
PTS-2025-001890 - Family Reunification
```

---

### Notifications

#### List Notifications
```http
GET /api/notifications?unreadOnly=true&page=1&limit=20
Authorization: Bearer <firebase-token>

Query Parameters:
- unreadOnly: boolean (default: false)
- page: number
- limit: number (max: 100)

Response 200:
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-id",
        "type": "CASE_STATUS_UPDATE",
        "title": "Case Status Updated",
        "message": "Your case is now under review",
        "isRead": false,
        "createdAt": "2025-10-18T12:00:00Z",
        "actionUrl": "/cases/case-id"
      }
    ],
    "pagination": { ... }
  }
}
```

#### Mark Notification as Read
```http
PATCH /api/notifications/{notificationId}
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "isRead": true
}

Response 200:
{
  "success": true,
  "data": { ... }
}
```

#### Mark All as Read
```http
POST /api/notifications/mark-all-read
Authorization: Bearer <firebase-token>

Response 200:
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### User Profile

#### Update Profile
```http
PATCH /api/users/profile
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}

Response 200:
{
  "success": true,
  "data": {
    "id": "user-id",
    "firstName": "John",
    "lastName": "Doe",
    ...
  }
}
```

#### Update Settings
```http
PATCH /api/users/settings
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "emailNotifications": true,
  "pushNotifications": true,
  "smsNotifications": false
}

Response 200:
{
  "success": true,
  "message": "Settings updated successfully"
}
```

#### Upload Avatar
```http
POST /api/users/avatar
Authorization: Bearer <firebase-token>
Content-Type: multipart/form-data

FormData:
- avatar: File (image, max 4MB)

Response 200:
{
  "success": true,
  "data": {
    "profilePicture": "https://..."
  }
}
```

---

### GDPR Compliance (NEW - October 2025)

#### Register with GDPR Consent
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "consentedAt": "2025-10-19T10:30:00.000Z",
  "acceptedTerms": true,
  "acceptedPrivacy": true,
  "acceptedMarketing": false
}

Response 201:
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "consentedAt": "2025-10-19T10:30:00.000Z",
      "acceptedTerms": true,
      "acceptedPrivacy": true,
      "acceptedMarketing": false,
      ...
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### Update Consent Preferences
```http
POST /api/users/consent
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "acceptedMarketing": true,
  "consentedAt": "2025-10-19T10:30:00.000Z"
}

Response 200:
{
  "success": true,
  "data": {
    "message": "Consent preferences updated successfully"
  }
}
```

#### Get Consent History (Audit Trail)
```http
GET /api/users/consent-history
Authorization: Bearer <firebase-token>

Response 200:
{
  "success": true,
  "data": {
    "userId": "user-id",
    "history": [
      {
        "id": "consent-001",
        "consentType": "TERMS_AND_CONDITIONS",
        "accepted": true,
        "consentedAt": "2025-10-19T10:30:00.000Z",
        "ipAddress": "192.168.1.1",
        "version": "1.0"
      },
      {
        "id": "consent-002",
        "consentType": "PRIVACY_POLICY",
        "accepted": true,
        "consentedAt": "2025-10-19T10:30:00.000Z"
      },
      {
        "id": "consent-003",
        "consentType": "MARKETING",
        "accepted": false,
        "consentedAt": "2025-10-19T10:30:00.000Z"
      }
    ]
  }
}
```

#### Export User Data (GDPR Right to Data Portability)
```http
GET /api/users/data-export
Authorization: Bearer <firebase-token>

Response 200:
{
  "success": true,
  "data": {
    "user": { /* full user data */ },
    "cases": [ /* all user cases */ ],
    "documents": [ /* all documents */ ],
    "messages": [ /* all messages */ ],
    "notifications": [ /* all notifications */ ],
    "consent": {
      "consentedAt": "2025-10-19T10:30:00.000Z",
      "acceptedTerms": true,
      "acceptedPrivacy": true,
      "acceptedMarketing": false,
      "termsAcceptedAt": "2025-10-19T10:30:00.000Z",
      "privacyAcceptedAt": "2025-10-19T10:30:00.000Z"
    },
    "consentHistory": [ /* consent audit trail */ ],
    "exportedAt": "2025-10-19T15:45:00.000Z",
    "format": "json"
  }
}
```

#### Delete Account (GDPR Right to Erasure)
```http
DELETE /api/users/account
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "reason": "No longer need the service"  // Optional
}

Response 200:
{
  "success": true,
  "data": {
    "message": "Account deletion scheduled. Your data will be permanently deleted within 30 days."
  }
}
```

**Backend Process:**
1. Immediate: Mark user as inactive, anonymize email, revoke tokens
2. After 30 days: Permanently delete all user data (scheduled job)
3. Legal retention: Keep anonymized audit logs if required by law

#### Withdraw Consent
```http
POST /api/users/consent/withdraw
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "consentType": "marketing"  // or "all" to delete account
}

Response 200:
{
  "success": true,
  "data": {
    "message": "Consent withdrawn successfully"
  }
}
```

#### Push Token Management
```http
PUT /api/users/push-token
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "pushToken": "ExponentPushToken[xxxxxx]",
  "platform": "ios",
  "deviceId": "device-123",
  "deviceModel": "iPhone 14 Pro",
  "osVersion": "17.0"
}

Response 200:
{
  "success": true,
  "data": {
    "message": "Push token updated successfully"
  }
}
```

```http
DELETE /api/users/push-token?platform=ios&deviceId=device-123
Authorization: Bearer <firebase-token>

Response 200:
{
  "success": true,
  "data": {
    "message": "Push token removed successfully"
  }
}
```

#### Get Legal Document Versions
```http
GET /api/legal/versions

Response 200:
{
  "success": true,
  "data": {
    "termsVersion": "1.0",
    "privacyVersion": "1.0",
    "lastUpdated": "2025-10-19T00:00:00.000Z"
  }
}
```

---

### System

#### Health Check
```http
GET /api/health

Response 200:
{
  "status": "ok",
  "timestamp": "2025-10-18T12:00:00Z",
  "uptime": 123456,
  "environment": "production",
  "database": "connected"
}
```

---

### Templates

#### List Templates
```http
GET /api/templates?serviceType=STUDENT_VISA&category=FORM

Query Parameters:
- serviceType: ServiceType (optional)
- category: string (optional) - FORM, GUIDE, SAMPLE, CHECKLIST

Response 200:
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template-id",
        "name": "Student Visa Application Form",
        "description": "Official application form for student visa",
        "serviceType": "STUDENT_VISA",
        "fileName": "student-visa-form.pdf",
        "fileSize": 524288,
        "mimeType": "application/pdf",
        "category": "FORM",
        "isRequired": true,
        "downloadCount": 156,
        "version": "2.1"
      }
    ]
  }
}
```

#### Download Template
```http
GET /api/templates/{templateId}

Response 200:
{
  "success": true,
  "data": {
    "template": {
      "id": "template-id",
      "fileUrl": "https://...",
      ...
    }
  }
}
```

**Usage in Mobile App:**
```typescript
// 1. Fetch templates
const templates = await apiClient.get('/templates?serviceType=STUDENT_VISA');

// 2. Download template
import { downloadAsync } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

const template = templates.data.data.templates[0];

// Track download
await apiClient.get(`/templates/${template.id}`);

// Download to device
const result = await downloadAsync(
  template.fileUrl,
  FileSystem.documentDirectory + template.fileName
);

// Open or share
await shareAsync(result.uri);
```

---

### Emails

#### Send Email
```http
POST /api/emails/send
Authorization: Bearer <firebase-token>
Content-Type: application/json

// For CLIENTS (case-based routing):
{
  "caseId": "case-uuid",
  "subject": "Question about my application",
  "content": "Hello, I have a question about..."
}

// For AGENTS/ADMINS (direct recipient):
{
  "recipientId": "client-uuid",
  "caseId": "case-uuid",  // optional
  "subject": "Update on your application",
  "content": "Good news! Your documents have been..."
}

Response 200:
{
  "success": true,
  "data": {
    "message": {
      "id": "message-id",
      "subject": "Question about...",
      "recipientName": "Agent Name",
      "sentAt": "2025-10-18T12:00:00Z",
      "threadId": "thread-id-for-replies"
    }
  },
  "message": "Email sent successfully"
}
```

**Email Routing Logic:**
- **Clients:** Must select a case. Email routes to assigned agent (or support email if unassigned)
- **Agents/Admins:** Select recipient directly. Can optionally associate with a case

**Features:**
- ✅ Emails stored in PostgreSQL Message table for tracking
- ✅ Automatic notification created for recipient (type: NEW_EMAIL)
- ✅ Thread ID included for reply tracking
- ✅ Beautiful HTML email template sent via SMTP
- ✅ Falls back to support email if no agent assigned to case

---

## Real-Time Chat Integration

### Overview

The messaging system uses **Firebase Realtime Database** for instant communication between clients and agents. Both web and mobile apps connect to the same Firebase project, enabling real-time cross-platform messaging.

### Architecture

```
Mobile App ←→ Firebase Realtime Database ←→ Web App
            Single source of truth
            Latency: < 100ms
```

### Firebase Setup

```typescript
// services/chat.service.ts
import { getDatabase, ref, push, set, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../config/firebase';

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
```

### Send Message

```typescript
export async function sendMessage(message: {
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  content: string;
  caseId?: string;
  subject?: string;
  attachments?: MessageAttachment[];
}): Promise<string> {
  const messagesRef = ref(database, 'messages');
  const newMessageRef = push(messagesRef);

  const messageData = {
    ...message,
    sentAt: Date.now(),
    isRead: false,
  };

  await set(newMessageRef, messageData);
  return newMessageRef.key!;
}
```

### Subscribe to Messages (Real-time)

```typescript
export function subscribeToMessages(
  userId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesRef = ref(database, 'messages');

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const messages: ChatMessage[] = [];
    
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      // Filter messages for current user
      if (message.senderId === userId || message.recipientId === userId) {
        messages.push({
          id: childSnapshot.key!,
          ...message,
        });
      }
    });
    
    // Sort by timestamp
    messages.sort((a, b) => a.sentAt - b.sentAt);
    callback(messages);
  });

  return unsubscribe;
}
```

### React Native Usage Example

```typescript
import { useEffect, useState } from 'react';
import { sendMessage, subscribeToMessages } from '../services/chat.service';

function ChatScreen({ currentUserId, recipientId }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Subscribe to real-time messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages(currentUserId, (msgs) => {
      // Filter for this conversation
      const conversationMsgs = msgs.filter(
        m => (m.senderId === currentUserId && m.recipientId === recipientId) ||
             (m.senderId === recipientId && m.recipientId === currentUserId)
      );
      setMessages(conversationMsgs);
    });

    return unsubscribe; // Cleanup on unmount
  }, [currentUserId, recipientId]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    await sendMessage({
      senderId: currentUserId,
      senderName: currentUser.name,
      senderEmail: currentUser.email,
      recipientId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      content: newMessage,
    });

    setNewMessage('');
  };

  return (
    <View>
      <FlatList
        data={messages}
        renderItem={({ item }) => <MessageBubble message={item} />}
      />
      <TextInput
        value={newMessage}
        onChangeText={setNewMessage}
        placeholder="Type a message..."
      />
      <Button title="Send" onPress={handleSend} />
    </View>
  );
}
```

### Presence Tracking (Online/Offline)

```typescript
// Set user online
export async function setUserOnline(
  userId: string,
  platform: 'web' | 'mobile' | 'desktop' = 'mobile'
): Promise<void> {
  const presenceRef = ref(database, `presence/${userId}`);
  
  await set(presenceRef, {
    userId,
    status: 'online',
    lastSeen: Date.now(),
    platform,
  });

  // Auto-disconnect when connection lost
  onDisconnect(presenceRef).set({
    userId,
    status: 'offline',
    lastSeen: Date.now(),
    platform,
  });
}

// Set user offline
export async function setUserOffline(userId: string): Promise<void> {
  const presenceRef = ref(database, `presence/${userId}`);
  await update(presenceRef, {
    status: 'offline',
    lastSeen: Date.now(),
  });
}

// Subscribe to user presence
export function subscribeToPresence(
  userId: string,
  callback: (status: 'online' | 'offline' | 'away') => void
): () => void {
  const presenceRef = ref(database, `presence/${userId}`);
  
  return onValue(presenceRef, (snapshot) => {
    const presence = snapshot.val();
    callback(presence?.status || 'offline');
  });
}
```

### Typing Indicators

```typescript
// Set typing status
export async function setTyping(
  userId: string,
  userName: string,
  chatRoomId: string,
  isTyping: boolean
): Promise<void> {
  const typingRef = ref(database, `typing/${chatRoomId}/${userId}`);
  
  if (isTyping) {
    await set(typingRef, {
      userId,
      userName,
      isTyping: true,
      timestamp: Date.now(),
    });
  } else {
    await set(typingRef, null);
  }
}

// Subscribe to typing indicators
export function subscribeToTyping(
  chatRoomId: string,
  currentUserId: string,
  callback: (typingUsers: string[]) => void
): () => void {
  const typingRef = ref(database, `typing/${chatRoomId}`);
  
  return onValue(typingRef, (snapshot) => {
    const typingUsers: string[] = [];
    const now = Date.now();
    
    snapshot.forEach((childSnapshot) => {
      const typing = childSnapshot.val();
      // Exclude current user and stale indicators (>5s)
      if (typing &&
          typing.userId !== currentUserId &&
          typing.isTyping &&
          (now - typing.timestamp) < 5000) {
        typingUsers.push(typing.userName);
      }
    });
    
    callback(typingUsers);
  });
}
```

### Offline Support

Firebase Realtime Database has built-in offline support:

```typescript
// Enable persistence (automatic in React Native)
import { getDatabase } from 'firebase/database';

// Messages are cached locally and synced when online
// No additional configuration needed!
```

---

## Error Handling

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| **200** | Success | Process response data |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid parameters (check input) |
| **401** | Unauthorized | Token expired (redirect to login) |
| **403** | Forbidden | No permission (show error) |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Duplicate data |
| **422** | Validation Error | Invalid data (show field errors) |
| **429** | Rate Limited | Too many requests (retry later) |
| **500-504** | Server Error | Backend issue (retry with backoff) |

### Error Response Format

```json
{
  "success": false,
  "error": "Authentication failed. Please login again.",
  "code": "AUTH_ERROR",
  "errors": {
    "email": ["Email is required"],
    "password": ["Password must be at least 6 characters"]
  },
  "meta": {
    "timestamp": "2025-10-18T12:00:00.000Z",
    "retryAfter": 60
  }
}
```

### Error Handling Example

```typescript
// hooks/useApi.ts
import { useState } from 'react';
import apiClient from '../api/client';

export function useApi<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string,
    data?: unknown
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient[method](url, data);
      return response.data.data;
    } catch (err: any) {
      if (err.response) {
        const { status, data } = err.response;
        
        switch (status) {
          case 400:
            setError(data.error || 'Invalid request');
            break;
          case 401:
            setError('Session expired. Please login again.');
            // Navigate to login
            break;
          case 403:
            setError('You do not have permission for this action');
            break;
          case 404:
            setError('Resource not found');
            break;
          case 422:
            // Handle validation errors
            const fieldErrors = Object.values(data.errors || {})
              .flat()
              .join(', ');
            setError(fieldErrors || 'Validation failed');
            break;
          case 429:
            const retryAfter = data.meta?.retryAfter || 60;
            setError(`Too many requests. Try again in ${retryAfter}s`);
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            setError('Server error. Please try again later');
            break;
          default:
            setError('An unexpected error occurred');
        }
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Check your connection.');
      } else if (err.message === 'Network Error') {
        setError('No internet connection');
      } else {
        setError('An unexpected error occurred');
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { request, loading, error };
}
```

---

## Pagination & Limits

### Overview

All list endpoints support pagination with a **maximum limit of 100 items** per request to prevent resource exhaustion.

### Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | number | 1 | - | Page number (1-indexed) |
| `limit` | number | 10-50* | 100 | Items per page |

*Default varies by endpoint

### Validation Rules

- ✅ Limit must be a positive integer (> 0)
- ✅ Limits > 100 are automatically clamped to 100
- ❌ Negative or zero limits return HTTP 400
- ❌ Non-numeric limits return HTTP 400

### Response Format

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMore": true
    }
  }
}
```

### React Native Pagination Hook

```typescript
// hooks/usePagination.ts
import { useState, useCallback } from 'react';
import apiClient from '../api/client';

interface PaginationOptions {
  endpoint: string;
  limit?: number;
}

export function usePagination<T>({ endpoint, limit = 20 }: PaginationOptions) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (pageNum: number) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const validLimit = Math.min(Math.max(1, limit), 100);
      const response = await apiClient.get(endpoint, {
        params: { page: pageNum, limit: validLimit }
      });
      
      const { items, pagination } = response.data.data;
      
      if (pageNum === 1) {
        setData(items);
      } else {
        setData(prev => [...prev, ...items]);
      }
      
      setPage(pageNum);
      setHasMore(pagination.hasMore);
    } catch (error) {
      console.error('Pagination error:', error);
    } finally {
      setLoading(false);
    }
  }, [endpoint, limit, loading]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage(page + 1);
    }
  }, [fetchPage, hasMore, loading, page]);

  const refresh = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1);
  }, [fetchPage]);

  // Initial load
  useEffect(() => {
    fetchPage(1);
  }, []);

  return { data, loading, hasMore, loadMore, refresh };
}

// Usage in component
function CasesList() {
  const { data, loading, hasMore, loadMore, refresh } = usePagination<Case>({
    endpoint: '/cases',
    limit: 20,
  });

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <CaseItem case={item} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshing={loading}
      onRefresh={refresh}
    />
  );
}
```

---

## Rate Limiting

### Limits by Endpoint Type

| Endpoint Type | Window | Max Requests | Notes |
|--------------|--------|--------------|-------|
| **Auth (Login/Register)** | 15 min | 10 | Strict |
| **Password Reset** | 15 min | 5 | Very Strict |
| **File Upload** | 1 min | 10 | Upload Limit |
| **Standard API** | 1 min | 60 | Normal |
| **High-Frequency** | 1 min | 120 | Generous |

### Response Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2025-10-18T12:01:00.000Z
Retry-After: 60  (only if rate limited)
```

### Handling Rate Limits

```typescript
// Check rate limit headers
apiClient.interceptors.response.use(
  (response) => {
    const remaining = response.headers['x-ratelimit-remaining'];
    if (remaining && parseInt(remaining) < 5) {
      console.warn(`Only ${remaining} requests remaining`);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      // Retry request
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## File Uploads

### Upload Endpoints

| Endpoint | Max Size | Max Files | Purpose |
|----------|----------|-----------|---------|
| `imageUploader` | 4MB | 1 | Profile pictures |
| `documentUploader` | 16MB | 5 | Case documents |
| `messageAttachment` | 8MB | 3 | Message files |

### Upload Document Example

```typescript
import * as DocumentPicker from 'expo-document-picker';

async function uploadDocument(caseId: string) {
  // 1. Pick document
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.type !== 'success') return;

  // 2. Create FormData
  const formData = new FormData();
  formData.append('file', {
    uri: result.uri,
    name: result.name,
    type: result.mimeType || 'application/octet-stream',
  } as any);
  formData.append('caseId', caseId);
  formData.append('documentType', 'PASSPORT');

  // 3. Upload
  try {
    const response = await apiClient.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`Upload progress: ${percentCompleted}%`);
      },
    });

    console.log('Document uploaded:', response.data);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### Upload with Progress

```typescript
import { useState } from 'react';

function useFileUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: any, data: any) => {
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });

    try {
      const response = await apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      return response.data;
    } finally {
      setUploading(false);
    }
  };

  return { upload, progress, uploading };
}
```

---

## Code Examples

### Complete Authentication Flow

```typescript
// services/auth.service.ts
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import apiClient from '../api/client';

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  // 1. Create Firebase user
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  );

  // 2. Sync with backend
  const response = await apiClient.post('/auth/register', data);

  return response.data.data;
}

export async function login(email: string, password: string) {
  // 1. Sign in with Firebase
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  // 2. Sync with backend
  await apiClient.post('/auth/login', {
    firebaseUid: userCredential.user.uid,
  });

  // 3. Get user profile
  const response = await apiClient.get('/auth/me');
  return response.data.data;
}

export async function logout() {
  await apiClient.post('/auth/logout');
  await firebaseSignOut(auth);
}
```

### Fetch Cases with Filters

```typescript
// services/cases.service.ts
import apiClient from '../api/client';

export async function getCases(filters?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const response = await apiClient.get('/cases', {
    params: {
      page: filters?.page || 1,
      limit: Math.min(filters?.limit || 20, 100),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.search && { search: filters.search }),
    },
  });

  return response.data.data;
}

export async function getCaseDetails(caseId: string) {
  const response = await apiClient.get(`/cases/${caseId}`);
  return response.data.data;
}

export async function createCase(data: {
  serviceType: string;
  priority?: string;
  notes?: string;
}) {
  const response = await apiClient.post('/cases', data);
  return response.data.data;
}
```

### Real-Time Chat Screen

```typescript
// screens/ChatScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, TextInput, Button } from 'react-native';
import { 
  sendMessage, 
  subscribeToMessages,
  setTyping,
  subscribeToTyping,
  setUserOnline,
  setUserOffline,
} from '../services/chat.service';

function ChatScreen({ currentUser, recipient, caseId }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Set online status
    setUserOnline(currentUser.id, 'mobile');

    // Subscribe to messages
    const unsubscribeMessages = subscribeToMessages(
      currentUser.id,
      (allMessages) => {
        const filtered = allMessages.filter(
          m => (m.senderId === currentUser.id && m.recipientId === recipient.id) ||
               (m.senderId === recipient.id && m.recipientId === currentUser.id)
        );
        setMessages(filtered);
      }
    );

    // Subscribe to typing indicators
    const chatRoomId = [currentUser.id, recipient.id].sort().join('_');
    const unsubscribeTyping = subscribeToTyping(
      chatRoomId,
      currentUser.id,
      setTypingUsers
    );

    return () => {
      setUserOffline(currentUser.id);
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [currentUser.id, recipient.id]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    await sendMessage({
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderEmail: currentUser.email,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      content: inputText,
      caseId,
    });

    setInputText('');
    
    // Stop typing indicator
    const chatRoomId = [currentUser.id, recipient.id].sort().join('_');
    setTyping(currentUser.id, currentUser.name, chatRoomId, false);
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    const chatRoomId = [currentUser.id, recipient.id].sort().join('_');
    
    // Start typing
    setTyping(currentUser.id, currentUser.name, chatRoomId, true);

    // Clear previous timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeout.current = setTimeout(() => {
      setTyping(currentUser.id, currentUser.name, chatRoomId, false);
    }, 3000);
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id!}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={item.senderId === currentUser.id}
          />
        )}
      />
      
      {typingUsers.length > 0 && (
        <Text>{typingUsers[0]} is typing...</Text>
      )}
      
      <View style={{ flexDirection: 'row', padding: 10 }}>
        <TextInput
          value={inputText}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          style={{ flex: 1, borderWidth: 1, padding: 10 }}
        />
        <Button title="Send" onPress={handleSend} />
      </View>
    </View>
  );
}
```

### Notification Management

```typescript
// services/notifications.service.ts
import apiClient from '../api/client';

export async function getNotifications(unreadOnly: boolean = false) {
  const response = await apiClient.get('/notifications', {
    params: { unreadOnly, limit: 50 },
  });
  return response.data.data;
}

export async function markAsRead(notificationId: string) {
  await apiClient.patch(`/notifications/${notificationId}`, {
    isRead: true,
  });
}

export async function markAllAsRead() {
  await apiClient.post('/notifications/mark-all-read');
}

// React Native usage with push notifications
import * as Notifications from 'expo-notifications';

export async function setupPushNotifications() {
  // Request permissions
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  // Get push token
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Send token to backend (save in user settings)
  await apiClient.patch('/users/settings', {
    pushToken: token,
  });

  // Handle notification tapped
  Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    // Navigate to relevant screen based on notification type
    if (data.caseId) {
      navigation.navigate('CaseDetails', { id: data.caseId });
    }
  });
}
```

---

## Best Practices

### 1. Token Management

```typescript
// Always get fresh tokens
const token = await auth.currentUser?.getIdToken(true); // Force refresh
```

### 2. Network Connectivity

```typescript
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener(state => {
  if (!state.isConnected) {
    showToast('No internet connection');
  }
});
```

### 3. Retry Logic

```typescript
async function requestWithRetry(
  fn: () => Promise<any>,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, 1000 * Math.pow(2, i))
      );
    }
  }
}
```

### 4. Cache API Responses

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5 minutes
): Promise<T> {
  const cached = await AsyncStorage.getItem(key);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < ttl) {
      return data;
    }
  }
  
  const fresh = await fetchFn();
  await AsyncStorage.setItem(key, JSON.stringify({
    data: fresh,
    timestamp: Date.now(),
  }));
  
  return fresh;
}
```

### 5. Handle Concurrent Requests

```typescript
// Use Promise.all for parallel requests
const [cases, documents, notifications] = await Promise.all([
  apiClient.get('/cases'),
  apiClient.get('/documents'),
  apiClient.get('/notifications'),
]);
```

---

## Testing

### Health Check

```bash
# Test API connectivity
curl https://your-api.com/api/health
```

### Test Authentication

```bash
# Register
curl -X POST https://your-api.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"John","lastName":"Doe"}'

# Login and get token
# Then test protected endpoint
curl https://your-api.com/api/auth/me \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

---

## Support & Resources

### Documentation
- **Full API Reference**: `/docs/NEXTJS_API_ROUTES.md`
- **Chat Integration**: `/docs/MOBILE_APP_INTEGRATION.md`
- **Data Types**: `/src/lib/types/index.ts`
- **Chat Service**: `/src/lib/firebase/chat.service.ts`

### Contact
- GitHub Issues: Report bugs or request features
- Email: support@patricktravel.com

---

**Last Updated**: October 19, 2025  
**API Version**: 1.0.0  
**Status**: Production Ready ✅

**Recent Updates (October 19, 2025):**
- ✅ **GDPR Compliance Endpoints** - Consent management, data export, account deletion
- ✅ Enhanced user model with consent tracking fields
- ✅ Push notification token management
- ✅ Consent history audit trail
- ✅ Marketing consent (optional)

**Recent Updates (October 18, 2025):**
- ✅ Added email messaging feature (`POST /api/emails/send`)
- ✅ Case-based email routing for clients
- ✅ Email tracking in PostgreSQL
- ✅ Automatic notifications (NEW_EMAIL type)
- ✅ User-friendly case selection (UX improvement)
- ✅ **Document templates feature** (`GET /api/templates`) - Downloadable forms & guides


