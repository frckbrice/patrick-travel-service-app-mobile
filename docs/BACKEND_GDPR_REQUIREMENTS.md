# Backend GDPR Requirements - Action Plan

**Target:** Make API GDPR compliant for mobile app  
**Deadline:** TBD  
**Priority:** HIGH (Required for EU launch)

---

## 📋 Quick Overview

The mobile app now sends GDPR consent data. Backend needs to:
1. Store consent fields in database
2. Add 3 new API endpoints
3. Modify 1 existing endpoint

**Estimated Time:** 4-6 hours

---

## 🔗 Mobile App Integration Overview

### What the Mobile App Does Now

The mobile app has been updated with GDPR compliance features:

1. **Registration Screen** (`features/auth/screens/RegisterScreen.tsx`)
   - Shows 2 checkboxes: Terms & Conditions + Privacy Policy
   - User MUST check both to register
   - When user registers, mobile sends consent data to backend

2. **User Profile** (`lib/api/user.api.ts`)
   - Can view their data
   - Can export all their data
   - Can delete their account

3. **TypeScript Types** (`lib/types/index.ts`)
   - Complete type definitions for all GDPR data
   - Backend should match these types

---

## 📊 Complete Data Flow

### Flow 1: User Registration with GDPR Consent

```
┌─────────────┐
│ Mobile App  │
│ (Register)  │
└──────┬──────┘
       │
       │ POST /api/auth/register
       │ {
       │   email: "user@example.com",
       │   password: "SecurePass123!",
       │   firstName: "John",
       │   lastName: "Doe",
       │   phone: "+1234567890",
       │   consentedAt: "2025-10-19T10:30:00.000Z",  ← NEW
       │   acceptedTerms: true,                       ← NEW
       │   acceptedPrivacy: true                      ← NEW
       │ }
       │
       ▼
┌──────────────┐
│   Backend    │
│   (Save to   │
│   Database)  │
└──────┬───────┘
       │
       │ Response 201
       │ {
       │   success: true,
       │   data: {
       │     user: {
       │       id: "user-123",
       │       email: "user@example.com",
       │       firstName: "John",
       │       lastName: "Doe",
       │       consentedAt: "2025-10-19T10:30:00.000Z",  ← Return these
       │       acceptedTerms: true,
       │       acceptedPrivacy: true,
       │       termsAcceptedAt: "2025-10-19T10:30:00.000Z",
       │       privacyAcceptedAt: "2025-10-19T10:30:00.000Z"
       │     },
       │     token: "jwt-token",
       │     refreshToken: "refresh-token"
       │   }
       │ }
       │
       ▼
┌─────────────┐
│ Mobile App  │
│ (Logged In) │
└─────────────┘
```

### Flow 2: Get User Profile

```
┌─────────────┐
│ Mobile App  │
└──────┬──────┘
       │
       │ GET /api/users/profile
       │ Headers: Authorization: Bearer <jwt-token>
       │
       ▼
┌──────────────┐
│   Backend    │
└──────┬───────┘
       │
       │ Response 200
       │ {
       │   success: true,
       │   data: {
       │     id: "user-123",
       │     email: "user@example.com",
       │     firstName: "John",
       │     lastName: "Doe",
       │     phone: "+1234567890",
       │     consentedAt: "2025-10-19T10:30:00.000Z",     ← Include these
       │     acceptedTerms: true,
       │     acceptedPrivacy: true,
       │     termsAcceptedAt: "2025-10-19T10:30:00.000Z",
       │     privacyAcceptedAt: "2025-10-19T10:30:00.000Z",
       │     dataExportRequests: 0,
       │     lastDataExport: null
       │   }
       │ }
       │
       ▼
┌─────────────┐
│ Mobile App  │
│ (Shows      │
│  Profile)   │
└─────────────┘
```

### Flow 3: Export User Data

```
┌─────────────┐
│ Mobile App  │
│ User taps   │
│"Export Data"│
└──────┬──────┘
       │
       │ GET /api/users/data-export
       │ Headers: Authorization: Bearer <jwt-token>
       │
       ▼
┌──────────────┐
│   Backend    │
│ 1. Get user  │
│ 2. Get cases │
│ 3. Get docs  │
│ 4. Get msgs  │
│ 5. Get notif │
│ 6. Increment │
│    counter   │
└──────┬───────┘
       │
       │ Response 200
       │ {
       │   success: true,
       │   data: {
       │     user: { id, email, firstName, ... },
       │     cases: [ { id, referenceNumber, ... } ],
       │     documents: [ { id, fileName, ... } ],
       │     messages: [ { id, content, ... } ],
       │     notifications: [ { id, title, ... } ],
       │     consent: {
       │       consentedAt: "2025-10-19T10:30:00.000Z",
       │       acceptedTerms: true,
       │       acceptedPrivacy: true,
       │       termsAcceptedAt: "2025-10-19T10:30:00.000Z",
       │       privacyAcceptedAt: "2025-10-19T10:30:00.000Z"
       │     },
       │     exportedAt: "2025-10-19T15:45:00.000Z",
       │     format: "json"
       │   }
       │ }
       │
       ▼
┌─────────────┐
│ Mobile App  │
│ (Downloads  │
│  JSON file) │
└─────────────┘
```

### Flow 4: Delete Account

```
┌─────────────┐
│ Mobile App  │
│ User taps   │
│"Delete      │
│ Account"    │
└──────┬──────┘
       │
       │ DELETE /api/users/account
       │ Headers: Authorization: Bearer <jwt-token>
       │ Body: { reason: "No longer need service" }  ← Optional
       │
       ▼
┌──────────────┐
│   Backend    │
│ 1. Set       │
│    isActive  │
│    = false   │
│ 2. Anonymize │
│    email     │
│ 3. Schedule  │
│    deletion  │
│    +30 days  │
└──────┬───────┘
       │
       │ Response 200
       │ {
       │   success: true,
       │   data: {
       │     message: "Account deletion scheduled. Your data will be permanently deleted within 30 days."
       │   }
       │ }
       │
       ▼
┌─────────────┐
│ Mobile App  │
│ (Logs out   │
│  user)      │
└─────────────┘
       │
       │ After 30 days...
       │
       ▼
┌──────────────┐
│ Scheduled    │
│ Deletion Job │
│ (Cron)       │
│              │
│ Permanently  │
│ deletes all  │
│ user data    │
└──────────────┘
```

---

## 📦 Mobile App Type Definitions

These are the exact TypeScript types the mobile app uses. Backend should match these:

### User Interface (Enhanced with GDPR fields)

```typescript
// Mobile: lib/types/index.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;  // 'CLIENT' | 'AGENT' | 'ADMIN'
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // GDPR Compliance Fields (NEW)
  consentedAt?: string | null;          // ISO timestamp when user consented
  acceptedTerms?: boolean;              // true if user accepted Terms
  acceptedPrivacy?: boolean;            // true if user accepted Privacy Policy
  termsAcceptedAt?: string | null;      // ISO timestamp when Terms accepted
  privacyAcceptedAt?: string | null;    // ISO timestamp when Privacy accepted
  dataExportRequests?: number;          // Counter: how many times user exported data
  lastDataExport?: Date | null;         // Last time user exported data
}
```

### RegisterRequest Interface

```typescript
// Mobile: lib/api/auth.api.ts
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  
  // GDPR consent fields (NEW - mobile sends these)
  consentedAt?: string;      // ISO timestamp: "2025-10-19T10:30:00.000Z"
  acceptedTerms?: boolean;   // true (required to register)
  acceptedPrivacy?: boolean; // true (required to register)
}
```

### DataExportResponse Interface

```typescript
// Mobile: lib/types/index.ts
export interface DataExportResponse {
  user: User;                    // Full user object
  cases: Case[];                 // All user's cases
  documents: Document[];         // All user's documents
  messages: Message[];           // All user's messages
  notifications: Notification[]; // All user's notifications
  consent: {
    consentedAt?: string;
    acceptedTerms?: boolean;
    acceptedPrivacy?: boolean;
    termsAcceptedAt?: string;
    privacyAcceptedAt?: string;
  };
  exportedAt: string;           // ISO timestamp when export was generated
  format: string;               // "json"
}
```

### Related Types

```typescript
// Mobile: lib/types/index.ts
export interface Case {
  id: string;
  referenceNumber: string;
  clientId: string;
  serviceType: ServiceType;
  status: CaseStatus;
  priority: Priority;
  submissionDate: Date;
  lastUpdated: Date;
  // ... other fields
}

export interface Document {
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
  // ... other fields
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  caseId?: string | null;
  subject?: string | null;
  content: string;
  isRead: boolean;
  readAt?: Date | null;
  sentAt: Date;
  // ... other fields
}

export interface Notification {
  id: string;
  userId: string;
  caseId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  // ... other fields
}
```

---

## 🔌 Endpoints and Request/Response Details

### 1. POST /api/auth/register

**Mobile Implementation:**
```typescript
// Mobile: lib/api/auth.api.ts
async register(data: RegisterRequest): Promise<ApiResponse<User>> {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
}

// Mobile: features/auth/screens/RegisterScreen.tsx
const registrationData = {
  email: "user@example.com",
  password: "SecurePass123!",
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890",
  consentedAt: new Date().toISOString(),  // "2025-10-19T10:30:00.000Z"
  acceptedTerms: true,
  acceptedPrivacy: true,
};
```

**Request Mobile Sends:**
```json
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
  "acceptedPrivacy": true
}
```

**Response Backend Should Send:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "role": "CLIENT",
      "isActive": true,
      "isVerified": false,
      "consentedAt": "2025-10-19T10:30:00.000Z",
      "acceptedTerms": true,
      "acceptedPrivacy": true,
      "termsAcceptedAt": "2025-10-19T10:30:00.000Z",
      "privacyAcceptedAt": "2025-10-19T10:30:00.000Z",
      "dataExportRequests": 0,
      "lastDataExport": null,
      "createdAt": "2025-10-19T10:30:00.000Z",
      "updatedAt": "2025-10-19T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. GET /api/users/profile

**Mobile Implementation:**
```typescript
// Mobile: lib/api/user.api.ts
async getProfile(): Promise<ApiResponse<User>> {
  const response = await apiClient.get('/users/profile');
  return response.data;
}
```

**Request Mobile Sends:**
```
GET /api/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Backend Should Send:**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "CLIENT",
    "isActive": true,
    "isVerified": true,
    "lastLogin": "2025-10-19T10:30:00.000Z",
    "consentedAt": "2025-10-19T10:30:00.000Z",
    "acceptedTerms": true,
    "acceptedPrivacy": true,
    "termsAcceptedAt": "2025-10-19T10:30:00.000Z",
    "privacyAcceptedAt": "2025-10-19T10:30:00.000Z",
    "dataExportRequests": 0,
    "lastDataExport": null,
    "createdAt": "2025-10-19T10:30:00.000Z",
    "updatedAt": "2025-10-19T10:30:00.000Z"
  }
}
```

---

### 3. GET /api/users/data-export

**Mobile Implementation:**
```typescript
// Mobile: lib/api/user.api.ts
async exportData(): Promise<ApiResponse<DataExportResponse>> {
  const response = await apiClient.get('/users/data-export');
  return response.data;
}
```

**Request Mobile Sends:**
```
GET /api/users/data-export
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Backend Should Send:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "role": "CLIENT",
      "consentedAt": "2025-10-19T10:30:00.000Z",
      "acceptedTerms": true,
      "acceptedPrivacy": true,
      "createdAt": "2025-10-19T10:30:00.000Z",
      "updatedAt": "2025-10-19T10:30:00.000Z"
    },
    "cases": [
      {
        "id": "case-001",
        "referenceNumber": "PTS-2025-001",
        "clientId": "user-123",
        "serviceType": "STUDENT_VISA",
        "status": "PROCESSING",
        "priority": "NORMAL",
        "submissionDate": "2025-10-01T10:00:00.000Z",
        "lastUpdated": "2025-10-15T14:30:00.000Z"
      }
    ],
    "documents": [
      {
        "id": "doc-001",
        "caseId": "case-001",
        "uploadedById": "user-123",
        "fileName": "passport.pdf",
        "originalName": "My Passport.pdf",
        "filePath": "https://uploadthing.com/f/abc123",
        "fileSize": 2048576,
        "mimeType": "application/pdf",
        "documentType": "PASSPORT",
        "status": "APPROVED",
        "uploadDate": "2025-10-01T10:00:00.000Z"
      }
    ],
    "messages": [
      {
        "id": "msg-001",
        "senderId": "user-123",
        "recipientId": "agent-456",
        "caseId": "case-001",
        "subject": "Question about my application",
        "content": "Hello, I have a question...",
        "isRead": true,
        "readAt": "2025-10-02T09:00:00.000Z",
        "sentAt": "2025-10-02T08:00:00.000Z"
      }
    ],
    "notifications": [
      {
        "id": "notif-001",
        "userId": "user-123",
        "caseId": "case-001",
        "type": "CASE_STATUS_UPDATE",
        "title": "Case Status Changed",
        "message": "Your case status has been updated to Processing",
        "isRead": true,
        "readAt": "2025-10-02T10:00:00.000Z",
        "createdAt": "2025-10-02T09:30:00.000Z"
      }
    ],
    "consent": {
      "consentedAt": "2025-10-19T10:30:00.000Z",
      "acceptedTerms": true,
      "acceptedPrivacy": true,
      "termsAcceptedAt": "2025-10-19T10:30:00.000Z",
      "privacyAcceptedAt": "2025-10-19T10:30:00.000Z"
    },
    "exportedAt": "2025-10-19T15:45:00.000Z",
    "format": "json"
  }
}
```

---

### 4. DELETE /api/users/account

**Mobile Implementation:**
```typescript
// Mobile: lib/api/user.api.ts
async deleteAccount(): Promise<ApiResponse<void>> {
  const response = await apiClient.delete('/users/account');
  return response.data;
}
```

**Request Mobile Sends:**
```
DELETE /api/users/account
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "No longer need the service"
}
```

**Response Backend Should Send:**
```json
{
  "success": true,
  "data": {
    "message": "Account deletion scheduled. Your data will be permanently deleted within 30 days."
  }
}
```

---

## 📋 Complete Endpoint Summary

| Method | Endpoint | Mobile Sends | Backend Returns | Status |
|--------|----------|--------------|-----------------|--------|
| POST | `/api/auth/register` | email, password, name, phone, **consentedAt, acceptedTerms, acceptedPrivacy** | user + token | ⚠️ UPDATE |
| GET | `/api/users/profile` | JWT token | user (including consent fields) | ⚠️ UPDATE |
| GET | `/api/users/data-export` | JWT token | Complete data dump | ❌ CREATE |
| DELETE | `/api/users/account` | JWT token + optional reason | Success message | ❌ CREATE |

---

## STEP 1: Update Database Schema (30 minutes)

### Add columns to `users` table:

```sql
ALTER TABLE users ADD COLUMN consentedAt TIMESTAMP;
ALTER TABLE users ADD COLUMN acceptedTerms BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN acceptedPrivacy BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN termsAcceptedAt TIMESTAMP;
ALTER TABLE users ADD COLUMN privacyAcceptedAt TIMESTAMP;
ALTER TABLE users ADD COLUMN dataExportRequests INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN lastDataExport TIMESTAMP;
ALTER TABLE users ADD COLUMN deletionScheduledFor TIMESTAMP;
```

**Test:** Run migration and verify columns exist.

---

## STEP 2: Update Registration Endpoint (1 hour)

### Modify: `POST /api/auth/register`

**Current request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**New request body (mobile will send):**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "consentedAt": "2025-10-19T10:30:00.000Z",
  "acceptedTerms": true,
  "acceptedPrivacy": true
}
```

**What to do:**
1. Accept 3 new optional fields: `consentedAt`, `acceptedTerms`, `acceptedPrivacy`
2. Store them in the `users` table
3. Set `termsAcceptedAt` and `privacyAcceptedAt` to same value as `consentedAt`
4. Return the same response as before (include new fields in user object)

**Validation:**
- If `acceptedTerms` is false or missing → return error 400
- If `acceptedPrivacy` is false or missing → return error 400

**Code example:**
```javascript
// In your registration handler
const { consentedAt, acceptedTerms, acceptedPrivacy, ...userData } = req.body;

// Validate consent
if (!acceptedTerms || !acceptedPrivacy) {
  return res.status(400).json({
    success: false,
    error: 'You must accept Terms & Privacy Policy to register'
  });
}

// Save to database
const user = await prisma.user.create({
  data: {
    ...userData,
    consentedAt: consentedAt || new Date().toISOString(),
    acceptedTerms: true,
    acceptedPrivacy: true,
    termsAcceptedAt: consentedAt || new Date().toISOString(),
    privacyAcceptedAt: consentedAt || new Date().toISOString(),
  }
});
```

**Test:** Register a new user from mobile app and verify fields are saved.

---

## STEP 3: Data Export Endpoint (2 hours)

### Create: `GET /api/users/data-export`

**Purpose:** User can download all their data (GDPR Right to Data Portability)

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "consentedAt": "2025-10-19T10:30:00.000Z",
      "acceptedTerms": true,
      "acceptedPrivacy": true,
      "createdAt": "2025-10-19T10:30:00.000Z"
    },
    "cases": [
      {
        "id": "case-123",
        "referenceNumber": "PTS-2025-001",
        "serviceType": "STUDENT_VISA",
        "status": "PROCESSING",
        "submissionDate": "2025-10-19T10:30:00.000Z"
      }
    ],
    "documents": [
      {
        "id": "doc-123",
        "fileName": "passport.pdf",
        "documentType": "PASSPORT",
        "uploadDate": "2025-10-19T10:30:00.000Z"
      }
    ],
    "messages": [
      {
        "id": "msg-123",
        "subject": "Case Update",
        "sentAt": "2025-10-19T10:30:00.000Z"
      }
    ],
    "notifications": [
      {
        "id": "notif-123",
        "title": "Status Update",
        "createdAt": "2025-10-19T10:30:00.000Z"
      }
    ],
    "consent": {
      "consentedAt": "2025-10-19T10:30:00.000Z",
      "acceptedTerms": true,
      "acceptedPrivacy": true,
      "termsAcceptedAt": "2025-10-19T10:30:00.000Z",
      "privacyAcceptedAt": "2025-10-19T10:30:00.000Z"
    },
    "exportedAt": "2025-10-19T15:45:00.000Z",
    "format": "json"
  }
}
```

**What to do:**
1. Get authenticated user ID from JWT token
2. Fetch user data from database
3. Fetch all related data: cases, documents, messages, notifications
4. Increment `dataExportRequests` counter
5. Update `lastDataExport` timestamp
6. Return everything as JSON

**Code example:**
```javascript
// GET /api/users/data-export
async function handleDataExport(req, res) {
  const userId = req.user.id; // From JWT token
  
  // Fetch all user data
  const [user, cases, documents, messages, notifications] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.case.findMany({ where: { clientId: userId } }),
    prisma.document.findMany({ where: { uploadedById: userId } }),
    prisma.message.findMany({ 
      where: { OR: [{ senderId: userId }, { recipientId: userId }] }
    }),
    prisma.notification.findMany({ where: { userId } }),
  ]);
  
  // Update export counter
  await prisma.user.update({
    where: { id: userId },
    data: {
      dataExportRequests: { increment: 1 },
      lastDataExport: new Date(),
    }
  });
  
  // Return complete data
  return res.json({
    success: true,
    data: {
      user,
      cases,
      documents,
      messages,
      notifications,
      consent: {
        consentedAt: user.consentedAt,
        acceptedTerms: user.acceptedTerms,
        acceptedPrivacy: user.acceptedPrivacy,
        termsAcceptedAt: user.termsAcceptedAt,
        privacyAcceptedAt: user.privacyAcceptedAt,
      },
      exportedAt: new Date().toISOString(),
      format: 'json'
    }
  });
}
```

**Rate Limiting:** Max 5 exports per day per user

**Test:** Call endpoint and verify all user data is returned.

---

## STEP 4: Account Deletion Endpoint (2 hours)

### Create: `DELETE /api/users/account`

**Purpose:** User can delete their account (GDPR Right to Erasure)

**Authentication:** Required (JWT token)

**Request body (optional):**
```json
{
  "reason": "No longer need the service"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Account deletion scheduled. Your data will be permanently deleted within 30 days."
  }
}
```

**What to do:**

### Immediate Actions (when endpoint is called):
1. Set `deletionScheduledFor` = current date + 30 days
2. Set `isActive` = false (user can't login)
3. Anonymize email: change to `deleted_[userId]@deleted.local`
4. Revoke all JWT tokens (add to blacklist or delete from sessions table)
5. Return success message

### Scheduled Job (after 30 days):
Create a cron job that runs daily and:
1. Find users where `deletionScheduledFor` < today
2. Delete their cases, documents, messages, notifications
3. Delete the user record

**Code example:**
```javascript
// DELETE /api/users/account
async function handleAccountDeletion(req, res) {
  const userId = req.user.id;
  const { reason } = req.body;
  
  // Schedule deletion (30 days from now)
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 30);
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      email: `deleted_${userId}@deleted.local`,
      deletionScheduledFor: deletionDate,
    }
  });
  
  // TODO: Revoke user's JWT tokens
  // TODO: Clear user's push notification tokens
  
  return res.json({
    success: true,
    data: {
      message: 'Account deletion scheduled. Your data will be permanently deleted within 30 days.'
    }
  });
}

// Scheduled job (run daily)
async function processScheduledDeletions() {
  const usersToDelete = await prisma.user.findMany({
    where: {
      deletionScheduledFor: {
        lte: new Date()
      }
    }
  });
  
  for (const user of usersToDelete) {
    // Delete all related data
    await Promise.all([
      prisma.case.deleteMany({ where: { clientId: user.id } }),
      prisma.document.deleteMany({ where: { uploadedById: user.id } }),
      prisma.message.deleteMany({ 
        where: { OR: [{ senderId: user.id }, { recipientId: user.id }] }
      }),
      prisma.notification.deleteMany({ where: { userId: user.id } }),
    ]);
    
    // Delete user
    await prisma.user.delete({ where: { id: user.id } });
    
    console.log(`Permanently deleted user: ${user.id}`);
  }
}
```

**Test:** 
1. Call endpoint and verify user is marked for deletion
2. Verify user cannot login
3. (For testing) Set `deletionScheduledFor` to past date and run scheduled job

---

## STEP 5: Profile Endpoint Update (30 minutes)

### Modify: `GET /api/users/profile`

**What to do:**
Include the new GDPR fields in the response.

**Current response:**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**New response:**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "consentedAt": "2025-10-19T10:30:00.000Z",
    "acceptedTerms": true,
    "acceptedPrivacy": true,
    "termsAcceptedAt": "2025-10-19T10:30:00.000Z",
    "privacyAcceptedAt": "2025-10-19T10:30:00.000Z",
    "dataExportRequests": 2,
    "lastDataExport": "2025-10-15T14:20:00.000Z"
  }
}
```

**Test:** Call endpoint and verify new fields are returned.

---

## 📊 Summary Checklist

**Database:**
- [ ] Add 8 columns to users table
- [ ] Run and test migration

**Endpoints:**
- [ ] Update `POST /api/auth/register` - Accept consent fields
- [ ] Update `GET /api/users/profile` - Return consent fields
- [ ] Create `GET /api/users/data-export` - Export user data
- [ ] Create `DELETE /api/users/account` - Delete account

**Scheduled Jobs:**
- [ ] Create daily cron job for account deletions

**Testing:**
- [ ] Register new user with consent
- [ ] Get user profile (verify consent fields)
- [ ] Export user data (verify complete data)
- [ ] Delete account (verify 30-day scheduling)
- [ ] Run deletion job (verify permanent deletion)

---

## 🧪 Testing Guide

### Test 1: Registration with Consent
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "John",
    "lastName": "Doe",
    "consentedAt": "2025-10-19T10:30:00.000Z",
    "acceptedTerms": true,
    "acceptedPrivacy": true
  }'
```

Expected: User created with consent fields saved.

### Test 2: Data Export
```bash
curl -X GET http://localhost:3000/api/users/data-export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected: Complete JSON with user data, cases, documents, messages, notifications.

### Test 3: Account Deletion
```bash
curl -X DELETE http://localhost:3000/api/users/account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test deletion"}'
```

Expected: Success message, user marked inactive, deletion scheduled for 30 days.

---

## ❓ FAQs

**Q: What if user registered before this update?**  
A: Existing users will have NULL values for consent fields. That's OK. They accepted terms when they registered under old system.

**Q: Should we force existing users to accept new terms?**  
A: Only if your legal documents changed significantly. Consult legal team.

**Q: What about documents stored in UploadThing/S3?**  
A: When deleting account, you'll need to also call UploadThing API to delete files. Add that to the deletion job.

**Q: Can user cancel deletion within 30 days?**  
A: Not in current mobile implementation. You can add a "cancel deletion" endpoint if needed.

**Q: Do we need consent history audit trail?**  
A: Not for basic compliance. Current implementation tracks when terms/privacy were accepted. That's sufficient.

---

## 📞 Questions?

Contact mobile team if you need clarification on:
- What data mobile app sends
- Expected response formats
- Error handling

---

**Created:** October 19, 2025  
**Last Updated:** October 20, 2025  
**Status:** Ready for Implementation  
**Mobile App:** ✅ Complete and waiting for backend

---

## 📱 Mobile-Specific Data Types & Enhancements

### Overview
This section documents all data types and enhancements that the mobile app has implemented but are NOT yet in the web API. The backend team needs to review these and decide which ones to implement in the API for mobile support.

### Important Note
**This document provides a comprehensive reference of all data types, enums, interfaces, and API contracts. The backend API should support both web and mobile platforms without data inconsistency. Mobile applications use the same base data structures as web (documented in `MOBILE_API_DATA_TYPES.md`) with additional GDPR-specific enhancements documented below.**

---

## 🔍 Mobile-Specific vs Web API Comparison

### Base Data Models (Web API Contract)
The mobile app uses the **exact same base data models** as the web application (see `docs/MOBILE_API_DATA_TYPES.md`):
- ✅ Role, ServiceType, CaseStatus, Priority enums - **MATCH**
- ✅ DocumentType, DocumentStatus, NotificationType enums - **MATCH** 
- ✅ MessageType, TransferReason enums - **MATCH**
- ✅ User, Case, Document, Message, Notification interfaces - **MATCH BASE FIELDS**
- ✅ TransferHistory, ActivityLog, FAQ interfaces - **MATCH**
- ✅ ApiResponse, PaginatedResponse wrappers - **MATCH**

### Mobile-Specific GDPR Enhancements

The following types are **mobile-specific** and not in the web API yet:

---

## 📋 Mobile-Specific Enumerations

### ConsentType (Mobile Only)
```typescript
// Location: mobile/lib/types/index.ts
export enum ConsentType {
  TERMS_AND_CONDITIONS = 'TERMS_AND_CONDITIONS',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  MARKETING = 'MARKETING',
  DATA_PROCESSING = 'DATA_PROCESSING',
}
```

**Purpose:** Used for tracking different types of user consent.

**Backend Implementation Needed:**
- Add `consent_type` enum to database
- Create `consent_records` table (see ConsentRecord below)

---

## 📦 Mobile-Specific Data Models

### 1. User Model - GDPR Fields (Mobile Enhancement)

**Web API User Model:**
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
```

**Mobile User Model (Enhanced with GDPR):**
```typescript
interface User {
  // ... all web fields above, PLUS:
  
  // ⚠️ MOBILE-SPECIFIC GDPR FIELDS
  consentedAt?: string | null;          // ISO timestamp when user consented
  acceptedTerms?: boolean;              // true if user accepted Terms
  acceptedPrivacy?: boolean;            // true if user accepted Privacy Policy
  termsAcceptedAt?: string | null;      // ISO timestamp when Terms accepted
  privacyAcceptedAt?: string | null;    // ISO timestamp when Privacy accepted
  dataExportRequests?: number;          // Counter: how many times user exported data
  lastDataExport?: Date | null;         // Last time user exported data
}
```

**SQL Schema Addition:**
```sql
-- Add to existing users table
ALTER TABLE users ADD COLUMN consentedAt TIMESTAMP;
ALTER TABLE users ADD COLUMN acceptedTerms BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN acceptedPrivacy BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN termsAcceptedAt TIMESTAMP;
ALTER TABLE users ADD COLUMN privacyAcceptedAt TIMESTAMP;
ALTER TABLE users ADD COLUMN dataExportRequests INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN lastDataExport TIMESTAMP;
```

---

### 2. ConsentRecord (Mobile Only)

```typescript
// Location: mobile/lib/types/index.ts
export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  accepted: boolean;
  consentedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  version?: string; // Version of the terms/policy accepted
}
```

**Purpose:** Detailed audit trail for user consent (for future use).

**Backend Implementation (Optional - Future Enhancement):**
```sql
CREATE TABLE consent_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  accepted BOOLEAN NOT NULL,
  consented_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  version VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX idx_consent_records_consent_type ON consent_records(consent_type);
```

---

### 3. ConsentHistory (Mobile Only)

```typescript
// Location: mobile/lib/types/index.ts
export interface ConsentHistory {
  userId: string;
  history: ConsentRecord[];
}
```

**Purpose:** Get complete consent history for a user.

**Backend Endpoint (Optional - Future Enhancement):**
```
GET /api/users/consent-history
```

---

### 4. UpdateConsentRequest (Mobile Only)

```typescript
// Location: mobile/lib/types/index.ts
export interface UpdateConsentRequest {
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
  consentedAt: string; // ISO timestamp
}
```

**Purpose:** Allow users to update their consent preferences.

**Backend Endpoint (Optional - Future Enhancement):**
```
PATCH /api/users/consent
Body: UpdateConsentRequest
```

---

### 5. DataExportRequest (Mobile Only)

```typescript
// Location: mobile/lib/types/index.ts
export interface DataExportRequest {
  id: string;
  userId: string;
  requestedAt: Date;
  completedAt?: Date | null;
  downloadUrl?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  format: 'JSON' | 'CSV' | 'PDF';
}
```

**Purpose:** Track data export requests (for async processing - future enhancement).

**Backend Implementation (Optional - Future Enhancement):**
```sql
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  download_url TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  format VARCHAR(10) DEFAULT 'JSON',
  expires_at TIMESTAMP
);
```

---

### 6. DataExportResponse (Mobile Enhanced)

**Web API doesn't have this endpoint yet. Mobile expects:**

```typescript
// Location: mobile/lib/types/index.ts
export interface DataExportResponse {
  user: User;
  cases: Case[];
  documents: Document[];
  messages: Message[];
  notifications: Notification[];
  consent: {
    consentedAt?: string;
    acceptedTerms?: boolean;
    acceptedPrivacy?: boolean;
    termsAcceptedAt?: string;
    privacyAcceptedAt?: string;
  };
  consentHistory?: ConsentRecord[]; // Optional, for future use
  exportedAt: string;
  format: string;
}
```

**Backend Endpoint Required:**
```
GET /api/users/data-export
Authorization: Bearer <jwt-token>
Response: DataExportResponse
```

See "STEP 3: Data Export Endpoint" in this document for full implementation details.

---

### 7. AccountDeletionRequest (Mobile Only)

```typescript
// Location: mobile/lib/types/index.ts
export interface AccountDeletionRequest {
  userId: string;
  reason?: string;
  scheduledDeletionDate: Date;
  immediateDataAnonymization: boolean;
}
```

**Purpose:** Internal type for tracking account deletion requests.

**Backend Implementation Required:**
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN deletionScheduledFor TIMESTAMP;
ALTER TABLE users ADD COLUMN deletionReason TEXT;
```

**Backend Endpoint Required:**
```
DELETE /api/users/account
Authorization: Bearer <jwt-token>
Body: { reason?: string }
Response: { success: true, message: "Account deletion scheduled..." }
```

See "STEP 4: Account Deletion Endpoint" in this document for full implementation details.

---

### 8. PushTokenRequest (Mobile vs Web Difference)

**Web API expects:**
```typescript
// POST /api/users/push-token
{
  token: string;
  platform?: 'ios' | 'android' | 'web';
  deviceId?: string;
}
```

**Mobile sends:**
```typescript
// Location: mobile/lib/types/index.ts
export interface PushTokenRequest {
  pushToken: string;     // ← Different field name
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  deviceModel?: string;  // ← Additional fields
  osVersion?: string;    // ← Additional fields
}
```

**Resolution:** Mobile API layer now transforms the request to match web API:
```typescript
// mobile/lib/api/user.api.ts
const requestData = {
  token: data.pushToken,      // Transform: pushToken → token
  platform: data.platform,
  deviceId: data.deviceId,
};
await apiClient.post('/users/push-token', requestData);
```

**Backend Action:** ✅ No changes needed - mobile now matches web API contract.

---

## 📤 Mobile-Specific Request/Response Enhancements

### RegisterRequest (GDPR Enhanced)

**Web API expects:**
```typescript
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  inviteCode?: string;
}
```

**Mobile sends (with GDPR fields):**
```typescript
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  inviteCode?: string;
  
  // ⚠️ MOBILE-SPECIFIC GDPR FIELDS
  consentedAt?: string;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
}
```

**Backend Implementation Required:**
See "STEP 2: Update Registration Endpoint" in this document.

---

### Case Model (Mobile Enhancement)

**Web API Case Model:**
```typescript
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
  // ... relations
}
```

**Mobile Case Model (with formData):**
```typescript
interface Case {
  // ... all web fields above, PLUS:
  
  // ⚠️ MOBILE-SPECIFIC FIELD
  formData?: any;  // Form submission data stored as JSON
}
```

**Backend Implementation (Optional):**
```sql
-- Add to cases table if storing form data is needed
ALTER TABLE cases ADD COLUMN form_data JSONB;
```

**Note:** This is mobile-specific and may not be needed in the API if form data is already captured elsewhere.

---

## 📊 Complete Mobile-Specific Types Summary

| Type | Category | Status | Backend Action Required |
|------|----------|--------|------------------------|
| **User GDPR fields** | Enhancement | Required | ✅ Add 7 fields to users table |
| **ConsentType** | Enum | Optional | ⚠️ Future enhancement |
| **ConsentRecord** | Interface | Optional | ⚠️ Future enhancement |
| **ConsentHistory** | Interface | Optional | ⚠️ Future enhancement |
| **UpdateConsentRequest** | Interface | Optional | ⚠️ Future enhancement |
| **DataExportRequest** | Interface | Optional | ⚠️ Future enhancement |
| **DataExportResponse** | Interface | Required | ✅ Implement GET /api/users/data-export |
| **AccountDeletionRequest** | Interface | Required | ✅ Implement DELETE /api/users/account |
| **PushTokenRequest** | Interface | Resolved | ✅ Mobile now transforms to match web |
| **RegisterRequest GDPR** | Enhancement | Required | ✅ Accept GDPR fields in registration |
| **Case.formData** | Enhancement | Optional | ⚠️ Only if needed |

---

## 🎯 Priority Implementation Guide

### HIGH PRIORITY (Required for Mobile Launch)
1. ✅ User Model GDPR fields (Step 1)
2. ✅ POST /api/auth/register - Accept GDPR fields (Step 2)
3. ✅ GET /api/users/data-export - Data export endpoint (Step 3)
4. ✅ DELETE /api/users/account - Account deletion endpoint (Step 4)
5. ✅ GET /api/users/profile - Return GDPR fields (Step 5)

### MEDIUM PRIORITY (Future Enhancements)
6. ⚠️ ConsentRecord table and endpoints (detailed audit trail)
7. ⚠️ DataExportRequest table (async data export processing)
8. ⚠️ Consent history endpoints

### LOW PRIORITY (Nice to Have)
9. ⚠️ Case.formData field (only if form data needs to be stored)

---

## 📝 API Compatibility Notes

### What's Already Compatible ✅
- All base enums (Role, ServiceType, CaseStatus, etc.) - **100% match**
- All core models (User, Case, Document, Message, etc.) - **Base fields match**
- ApiResponse and PaginatedResponse wrappers - **Structure matches**
- All web API endpoints - **Mobile uses same endpoints**

### What Needs Backend Updates ⚠️
- User model missing GDPR fields
- POST /api/auth/register doesn't accept GDPR fields yet
- GET /api/users/profile doesn't return GDPR fields yet
- GET /api/users/data-export doesn't exist yet
- DELETE /api/users/account doesn't exist yet

### Mobile-Specific Types for Future Consideration 📋
- ConsentType enum
- ConsentRecord interface
- ConsentHistory interface
- UpdateConsentRequest interface
- DataExportRequest interface

---

## 🔗 Related Documentation

- **Web API Contract:** `docs/MOBILE_API_DATA_TYPES.md` - Complete reference of all base types
- **Mobile Types:** `lib/types/index.ts` - Mobile type definitions (includes web + GDPR)
- **Mobile API Layer:** `lib/api/*.api.ts` - API client implementations
- **GDPR Compliance:** `docs/GDPR_COMPLIANCE.md` - GDPR implementation details

---

**Last Updated:** October 20, 2025  
**Maintained By:** Mobile Team  
**Backend Team Contact:** For questions about implementation

