# Mobile API Integration - Data Types Reference

> **Version:** 1.0  
> **Last Updated:** October 19, 2025  
> **Target Audience:** Mobile developers integrating with the Patrick Travel Services web API

This document provides a comprehensive reference of all data types, enums, interfaces, and API contracts used by the Patrick Travel Services web application. Mobile applications must use these exact data structures to ensure consistency and avoid data inconsistency when consuming the web API.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Enumerations](#enumerations)
3. [Core Data Models](#core-data-models)
4. [API Request/Response Types](#api-requestresponse-types)
5. [Firebase Real-Time Types](#firebase-real-time-types)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Error Handling](#error-handling)

---

## Authentication

### Firebase Authentication
All API requests (except public endpoints) require Firebase Authentication. The mobile app must:

1. Authenticate users with Firebase Auth (using email/password or OAuth providers)
2. Get the Firebase ID token: `await user.getIdToken()`
3. Send the token in the `Authorization` header: `Bearer <token>`

### Custom Claims
After successful authentication, the backend sets custom claims on the Firebase ID token:
```typescript
{
  role: 'CLIENT' | 'AGENT' | 'ADMIN',
  userId: string // Database user ID
}
```

### Authentication Headers
```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

---

## Enumerations

### Role
```typescript
enum Role {
  CLIENT = 'CLIENT',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN'
}
```

### ServiceType
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

### CaseStatus
```typescript
enum CaseStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DOCUMENTS_REQUIRED = 'DOCUMENTS_REQUIRED',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED'
}
```

### Priority
```typescript
enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}
```

### DocumentType
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

### DocumentStatus
```typescript
enum DocumentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}
```

### NotificationType
```typescript
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

### MessageType
```typescript
enum MessageType {
  CHAT = 'CHAT',
  EMAIL = 'EMAIL'
}
```

### TransferReason
```typescript
enum TransferReason {
  REASSIGNMENT = 'REASSIGNMENT',
  COVERAGE = 'COVERAGE',
  SPECIALIZATION = 'SPECIALIZATION',
  WORKLOAD = 'WORKLOAD',
  OTHER = 'OTHER'
}
```

---

## Core Data Models

### User
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

### Case
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
```

### Document
```typescript
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
  
  // Optional relations (when included)
  case?: {
    id: string;
    referenceNumber: string;
    serviceType: ServiceType;
    status: CaseStatus;
  };
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
```

### Message
```typescript
interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  caseId?: string | null;
  subject?: string | null;
  content: string;
  isRead: boolean;
  readAt?: Date | null;
  sentAt: Date;
  attachments?: MessageAttachment[];
  messageType?: MessageType;
  emailThreadId?: string | null;
  replyToId?: string | null;
}
```

### MessageAttachment
```typescript
interface MessageAttachment {
  id?: string;
  url: string;
  name: string;
  size: number; // bytes
  type: string; // MIME type
  uploadedAt?: string; // ISO timestamp
  metadata?: Record<string, unknown>;
}
```

### Notification
```typescript
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
  
  // Optional relations (when included)
  case?: {
    id: string;
    referenceNumber: string;
    serviceType: ServiceType;
  };
}
```

### StatusHistory
```typescript
interface StatusHistory {
  id: string;
  caseId: string;
  status: CaseStatus;
  changedBy: string;
  notes?: string | null;
  timestamp: Date;
}
```

### TransferHistory
```typescript
interface TransferHistory {
  id: string;
  caseId: string;
  fromAgentId?: string | null;
  fromAgentName?: string | null;
  toAgentId?: string | null;
  toAgentName?: string | null;
  transferredBy?: string | null;
  reason: TransferReason;
  handoverNotes?: string | null;
  transferredAt: Date;
  notifyClient: boolean;
  notifyAgent: boolean;
  
  // Optional relations (when included)
  fromAgent?: User | null;
  toAgent?: User | null;
  transferredByUser?: User | null;
}
```

### FAQ
```typescript
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

### ActivityLog
```typescript
interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: ActivityLogMetadata;
  timestamp: Date;
}

interface ActivityLogMetadata {
  caseId?: string;
  documentId?: string;
  messageId?: string;
  previousValue?: string;
  newValue?: string;
  additionalInfo?: string;
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
```

### Paginated Response
```typescript
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

### Authentication Requests

#### Register Request
```typescript
interface RegisterRequest {
  email: string; // Must be valid email
  password: string; // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  firstName: string; // Min 2 chars
  lastName: string; // Min 2 chars
  phone?: string; // Optional, format: +[country code][number]
  inviteCode?: string; // Required for AGENT/ADMIN registration
}
```

#### Register Response
```typescript
interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    customToken: string; // Firebase custom token for mobile sign-in
  };
}
```

#### Login Request
```typescript
interface LoginRequest {
  // Note: Mobile apps authenticate with Firebase first, then call this endpoint
  // The endpoint expects Authorization header with Firebase ID token
}
```

#### Login Response
```typescript
interface LoginResponse {
  success: boolean;
  data: {
    user: User;
  };
  message: string;
}
```

#### Current User Response
```typescript
// GET /api/auth/me
interface CurrentUserResponse {
  success: boolean;
  data: User;
}
```

### Case Requests

#### Create Case Request
```typescript
interface CreateCaseRequest {
  serviceType: ServiceType; // Required
  priority?: Priority; // Optional, defaults to 'NORMAL'
}
```

#### Create Case Response
```typescript
interface CreateCaseResponse {
  success: boolean;
  data: {
    case: Case; // Includes client relation
  };
  message: string;
}
```

#### List Cases Request (Query Parameters)
```typescript
interface ListCasesParams {
  status?: CaseStatus;
  userId?: string; // For agents to filter by client
  page?: number; // Default: 1
  limit?: number; // Default: 10, Max: 100
}
```

#### List Cases Response
```typescript
interface ListCasesResponse {
  success: boolean;
  data: {
    cases: Case[]; // Includes client and assignedAgent relations
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}
```

#### Update Case Request
```typescript
interface UpdateCaseRequest {
  serviceType?: ServiceType;
  status?: CaseStatus;
  priority?: Priority;
  internalNotes?: string;
}
```

#### Update Case Status Request
```typescript
// PATCH /api/cases/[id]/status
interface UpdateCaseStatusRequest {
  status: CaseStatus; // Required
  note?: string; // Optional note for status history
}
```

#### Assign Case Request
```typescript
// PATCH /api/cases/[id]/assign
interface AssignCaseRequest {
  agentId: string; // Must be a valid AGENT user ID
}
```

#### Transfer Case Request
```typescript
// POST /api/cases/[id]/transfer
interface TransferCaseRequest {
  newAgentId: string; // Required
  reason: TransferReason; // Required
  handoverNotes?: string; // Optional
  notifyClient?: boolean; // Default: true
  notifyAgent?: boolean; // Default: true
}
```

#### Transfer Case Response
```typescript
interface TransferCaseResponse {
  success: boolean;
  data: {
    case: Case;
    notificationsRequested: {
      client: boolean;
      agent: boolean;
    };
    notificationsDelivered: {
      client: boolean;
      agent: boolean;
    };
  };
  message: string;
}
```

#### Bulk Case Operations Request
```typescript
// POST /api/cases/bulk
interface BulkCaseOperationRequest {
  operation: 'ASSIGN' | 'UPDATE_STATUS' | 'UPDATE_PRIORITY';
  caseIds: string[]; // Max 100 case IDs
  data: {
    // For ASSIGN operation
    assignedAgentId?: string;
    
    // For UPDATE_STATUS operation
    status?: CaseStatus;
    
    // For UPDATE_PRIORITY operation
    priority?: Priority;
  };
}
```

#### Bulk Case Operations Response
```typescript
interface BulkCaseOperationResponse {
  success: boolean;
  data: {
    updatedCount: number;
  };
  message: string;
}
```

### Document Requests

#### List Documents Request (Query Parameters)
```typescript
interface ListDocumentsParams {
  caseId?: string;
  type?: DocumentType;
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
}
```

#### List Documents Response
```typescript
interface ListDocumentsResponse {
  success: boolean;
  data: {
    documents: Document[]; // Includes case and uploadedBy relations
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}
```

#### Create Document Metadata Request
```typescript
// POST /api/documents
// Called AFTER uploading file to UploadThing
interface CreateDocumentRequest {
  fileName: string; // Required
  originalName: string; // Optional, defaults to fileName
  filePath: string; // Required (UploadThing URL)
  fileSize: number; // Required (bytes)
  mimeType: string; // Required
  documentType: DocumentType; // Required
  caseId: string; // Required
}
```

#### Approve Document Response
```typescript
// PATCH /api/documents/[id]/approve
interface ApproveDocumentResponse {
  success: boolean;
  data: {
    document: Document;
  };
  message: string;
}
```

#### Reject Document Request
```typescript
// PATCH /api/documents/[id]/reject
interface RejectDocumentRequest {
  reason: string; // Required
}
```

### User Requests

#### List Users Request (Query Parameters)
```typescript
interface ListUsersParams {
  role?: Role;
  search?: string; // Search in email, firstName, lastName
  page?: number; // Default: 1
  limit?: number; // Default: 10, Max: 100
  includeCaseCounts?: boolean; // Default: false
}
```

#### List Users Response
```typescript
interface ListUsersResponse {
  success: boolean;
  data: {
    users: (User & {
      casesCount?: number; // Only if includeCaseCounts=true
      activeCases?: number; // Only if includeCaseCounts=true
    })[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
}
```

#### Update Profile Request
```typescript
// PATCH /api/users/profile
interface UpdateProfileRequest {
  firstName?: string; // Min 2 chars
  lastName?: string; // Min 2 chars
  phone?: string; // International format: +1234567890 or national: 0123456789
  profilePicture?: string; // Must be HTTP/HTTPS URL
}
```

#### Save Push Token Request
```typescript
// POST /api/users/push-token
interface SavePushTokenRequest {
  token: string; // Required, Expo push token
  platform?: 'ios' | 'android' | 'web'; // Optional
  deviceId?: string; // Optional, unique device identifier
}
```

#### Delete Push Token Request (Query Parameters)
```typescript
// DELETE /api/users/push-token
interface DeletePushTokenParams {
  deviceId?: string; // Optional, if not provided, deletes all tokens
  platform?: string; // Optional
}
```

### Notification Requests

#### List Notifications Request (Query Parameters)
```typescript
interface ListNotificationsParams {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
  type?: NotificationType; // Filter by type
  status?: 'read' | 'unread'; // Filter by read status
  search?: string; // Search in title/message
  sortBy?: 'createdAt' | 'type' | 'readAt'; // Default: 'createdAt'
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}
```

#### List Notifications Response
```typescript
interface ListNotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    unreadCount: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters: {
      type?: string;
      status?: string;
      search?: string;
      sortBy: string;
      sortOrder: string;
    };
  };
  message: string;
}
```

#### Mark Notification as Read Request
```typescript
// PATCH /api/notifications/[id]
// No request body needed
```

#### Mark All Notifications as Read Request
```typescript
// POST /api/notifications/mark-all-read
// No request body needed
```

### FAQ Requests

#### List FAQs Request (Query Parameters)
```typescript
interface ListFAQsParams {
  category?: string; // Filter by category
  includeInactive?: boolean; // Default: false, only ADMIN can see inactive
}
```

#### List FAQs Response
```typescript
interface ListFAQsResponse {
  success: boolean;
  data: {
    faqs: FAQ[];
    faqsByCategory: Record<string, FAQ[]>;
    categories: string[];
    total: number;
  };
}
```

### Invite Code Requests

#### Create Invite Code Request
```typescript
// POST /api/admin/invite-codes (ADMIN only)
interface CreateInviteCodeRequest {
  role: 'AGENT' | 'ADMIN'; // Required
  expiresInDays?: number; // Default: 7, Min: 1, Max: 365
  maxUses?: number; // Default: 1, Min: 1, Max: 100
  purpose?: string; // Optional, for tracking
}
```

#### List Invite Codes Request (Query Parameters)
```typescript
// GET /api/admin/invite-codes (ADMIN only)
interface ListInviteCodesParams {
  page?: number; // Default: 1
  limit?: number; // Default: 10, Max: 100
  role?: 'AGENT' | 'ADMIN';
  status?: 'active' | 'expired' | 'exhausted';
  search?: string; // Search in code or purpose
  sortBy?: 'createdAt' | 'role' | 'usedCount' | 'expiresAt' | 'lastUsedAt';
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}
```

---

## Firebase Real-Time Types

### Chat Message (Firebase Realtime Database)
```typescript
interface ChatMessage {
  id?: string; // Firebase push key
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
  readAt?: number; // Unix timestamp
  sentAt: number; // Unix timestamp
  attachments?: MessageAttachment[];
}
```

### Chat Room (Firebase Realtime Database)
```typescript
interface ChatRoom {
  id?: string; // Firebase push key or composite key
  participants: Record<string, boolean>; // userId -> true
  caseId?: string;
  lastMessage?: string;
  lastMessageAt?: number; // Unix timestamp
  unreadCount?: Record<string, number>; // userId -> count
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}
```

### User Presence (Firebase Realtime Database)
```typescript
interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: number; // Unix timestamp
  platform?: 'web' | 'mobile' | 'desktop';
}
```

### Typing Indicator (Firebase Realtime Database)
```typescript
interface TypingIndicator {
  userId: string;
  userName: string;
  chatRoomId: string;
  isTyping: boolean;
  timestamp: number; // Unix timestamp
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

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register` | No | Register new user (CLIENT by default, AGENT/ADMIN with invite code) |
| POST | `/api/auth/login` | Yes (Firebase token) | Sync user data after Firebase authentication |
| POST | `/api/auth/logout` | Yes | Logout user and revoke refresh tokens |
| GET | `/api/auth/me` | Yes | Get current authenticated user |

### User Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/users` | Yes (AGENT/ADMIN) | List users with filters and pagination |
| GET | `/api/users/[id]` | Yes | Get user by ID |
| PATCH | `/api/users/profile` | Yes | Update current user's profile |
| POST | `/api/users/push-token` | Yes | Save push notification token |
| DELETE | `/api/users/push-token` | Yes | Remove push notification token |

### Case Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/cases` | Yes | List cases with filters and pagination |
| POST | `/api/cases` | Yes | Create new case |
| GET | `/api/cases/[id]` | Yes | Get case by ID with relations |
| PUT | `/api/cases/[id]` | Yes | Update case |
| DELETE | `/api/cases/[id]` | Yes (ADMIN) | Delete case |
| PATCH | `/api/cases/[id]/status` | Yes (AGENT/ADMIN) | Update case status |
| PATCH | `/api/cases/[id]/assign` | Yes (ADMIN) | Assign case to agent |
| POST | `/api/cases/[id]/transfer` | Yes (ADMIN) | Transfer case to another agent |
| POST | `/api/cases/bulk` | Yes (ADMIN) | Bulk operations on cases |

### Document Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/documents` | Yes | List documents with filters and pagination |
| POST | `/api/documents` | Yes | Save document metadata after upload |
| GET | `/api/documents/[id]` | Yes | Get document by ID |
| PUT | `/api/documents/[id]` | Yes | Update document |
| DELETE | `/api/documents/[id]` | Yes (AGENT/ADMIN) | Delete document |
| PATCH | `/api/documents/[id]/approve` | Yes (AGENT/ADMIN) | Approve document |
| PATCH | `/api/documents/[id]/reject` | Yes (AGENT/ADMIN) | Reject document with reason |

### Notification Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/notifications` | Yes | List notifications with filters and pagination |
| POST | `/api/notifications` | Yes (AGENT/ADMIN) | Create notification |
| PATCH | `/api/notifications/[id]` | Yes | Mark notification as read |
| POST | `/api/notifications/mark-all-read` | Yes | Mark all notifications as read |

### Message Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/messages` | Yes | Get user's conversations (DEPRECATED - use Firebase directly) |
| POST | `/api/messages` | Yes | Send message (DEPRECATED - use Firebase directly) |

> **Note:** The messaging system uses Firebase Realtime Database directly. Mobile apps should use the Firebase SDK with the functions from the `chat.service` (see Firebase Real-Time Types section).

### FAQ Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/faq` | No | Get all active FAQs (public endpoint) |
| POST | `/api/faq` | Yes (ADMIN) | Create new FAQ |
| GET | `/api/faq/[id]` | No | Get FAQ by ID |
| PUT | `/api/faq/[id]` | Yes (ADMIN) | Update FAQ |
| DELETE | `/api/faq/[id]` | Yes (ADMIN) | Delete FAQ |

### Admin Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/admin/invite-codes` | Yes (ADMIN) | Generate invite code |
| GET | `/api/admin/invite-codes` | Yes (ADMIN) | List invite codes with filters |
| POST | `/api/admin/invite-codes/validate` | No | Validate invite code |
| GET | `/api/admin/activity-logs` | Yes (ADMIN) | List activity logs |
| GET | `/api/admin/activity-logs/export` | Yes (ADMIN) | Export activity logs as CSV |

---

## Error Handling

### Error Response Structure
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any; // Optional additional error details
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User doesn't have permission for this resource |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Error Messages

```typescript
const ERROR_MESSAGES = {
  // Authentication
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'You do not have permission to access this resource',
  INVALID_TOKEN: 'Invalid authentication token',
  SESSION_EXPIRED: 'Your session has expired. Please login again',
  
  // Validation
  VALIDATION_ERROR: 'Validation error',
  INVALID_EMAIL: 'Invalid email address',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  
  // Resources
  NOT_FOUND: 'Resource not found',
  USER_NOT_FOUND: 'User not found',
  CASE_NOT_FOUND: 'Case not found',
  DOCUMENT_NOT_FOUND: 'Document not found',
  
  // Business Logic
  USER_ALREADY_EXISTS: 'User with this email already exists',
  ACCOUNT_INACTIVE: 'Your account is inactive',
  INVALID_INVITE_CODE: 'Invalid or expired invite code',
  
  // Server
  SERVER_ERROR: 'An unexpected error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
};
```

### Validation Error Response
```typescript
interface ValidationErrorResponse {
  success: false;
  error: string;
  details: Record<string, string[]>; // field -> [error messages]
}

// Example:
{
  "success": false,
  "error": "Validation error",
  "details": {
    "email": ["Invalid email address"],
    "password": [
      "Password must be at least 8 characters",
      "Password must contain at least one uppercase letter"
    ]
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

### Rate Limit Presets

| Preset | Requests per Window | Window Duration |
|--------|---------------------|-----------------|
| GENEROUS | 100 | 60 seconds |
| STANDARD | 50 | 60 seconds |
| STRICT | 20 | 60 seconds |

### Rate Limit Headers
```http
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 48
X-RateLimit-Reset: 1697654400
```

### Rate Limit Exceeded Response
```typescript
{
  "success": false,
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45 // seconds
}
```

---

## Pagination

All list endpoints support pagination:

### Query Parameters
```typescript
interface PaginationParams {
  page?: number; // Default: 1, Min: 1
  limit?: number; // Default: varies by endpoint, Max: 100
}
```

### Response Format
```typescript
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 145,
    "totalPages": 15
  }
}
```

---

## Date Handling

### Formats
- **API Request/Response:** ISO 8601 strings (`2025-10-19T14:30:00.000Z`)
- **Firebase Timestamps:** Unix timestamps in milliseconds (`1697654400000`)

### TypeScript Date Serialization
When sending dates to the API:
```typescript
// Convert Date to ISO string
const date = new Date();
const isoString = date.toISOString();

// Send in request body
{
  "submissionDate": isoString
}
```

When receiving dates from the API:
```typescript
// Parse ISO string to Date
const date = new Date(response.data.submissionDate);
```

---

## File Uploads

File uploads use **UploadThing** (not direct API upload):

### Process
1. **Upload file to UploadThing** using their SDK
2. **Receive file URL and metadata** from UploadThing
3. **Save metadata to API** using `POST /api/documents`

### Mobile Implementation
```typescript
// 1. Upload to UploadThing
const fileUrl = await uploadToUploadThing(file);

// 2. Save metadata to database
const response = await fetch('/api/documents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileName: 'unique-file-name.pdf',
    originalName: 'original-file-name.pdf',
    filePath: fileUrl,
    fileSize: file.size,
    mimeType: file.type,
    documentType: 'PASSPORT',
    caseId: 'case-id-here'
  })
});
```

---

## Push Notifications

### Expo Push Notifications
The API supports Expo push notifications for mobile apps.

### Register Device Token
```typescript
// When user logs in or app starts
await fetch('/api/users/push-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: expoPushToken, // ExponentPushToken[...]
    platform: Platform.OS, // 'ios' or 'android'
    deviceId: deviceId // Unique device ID
  })
});
```

### Unregister Device Token
```typescript
// When user logs out
await fetch(`/api/users/push-token?deviceId=${deviceId}&platform=${Platform.OS}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`
  }
});
```

### Push Notification Payload
```typescript
{
  "to": "ExponentPushToken[...]",
  "sound": "default",
  "title": "Case Status Updated",
  "body": "Your case PT-123456 is now under review",
  "data": {
    "type": "CASE_STATUS_UPDATE",
    "caseId": "case-id-here",
    "actionUrl": "/dashboard/cases/case-id-here"
  }
}
```

---

## CORS Configuration

The API supports CORS for mobile applications:

### Allowed Origins
- `http://localhost:*` (development)
- `https://your-app.com` (production)
- `exp://` (Expo development)
- Mobile app schemes

### Allowed Methods
- GET, POST, PUT, PATCH, DELETE, OPTIONS

### Allowed Headers
- Authorization, Content-Type, X-Requested-With

---

## Security Best Practices

### For Mobile Developers

1. **Never store Firebase credentials in code** - Use environment variables
2. **Always validate SSL certificates** - Don't disable certificate validation
3. **Store tokens securely** - Use secure storage (Keychain/Keystore)
4. **Implement request timeouts** - Don't wait indefinitely for responses
5. **Handle token refresh** - Firebase tokens expire after 1 hour
6. **Sanitize user input** - Validate all data before sending to API
7. **Log errors, not sensitive data** - Don't log tokens, passwords, PII
8. **Implement offline mode** - Cache data for offline access
9. **Use HTTPS only** - Never use HTTP in production
10. **Implement retry logic** - Handle network failures gracefully

### Token Refresh Example
```typescript
// Check if token is about to expire and refresh
const user = auth.currentUser;
if (user) {
  try {
    const tokenResult = await user.getIdTokenResult();
    const expirationTime = new Date(tokenResult.expirationTime).getTime();
    const now = Date.now();
    
    // Refresh if token expires in less than 5 minutes
    if (expirationTime - now < 5 * 60 * 1000) {
      const freshToken = await user.getIdToken(true); // Force refresh
      // Use freshToken for API calls
    }
  } catch (error) {
    // Handle token refresh error
    console.error('Token refresh failed:', error);
  }
}
```

---

## Testing Endpoints

### Health Check
```http
GET /api/health
```

Response:
```json
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2025-10-19T14:30:00.000Z"
}
```

---

## Additional Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **UploadThing Documentation:** https://docs.uploadthing.com
- **Expo Push Notifications:** https://docs.expo.dev/push-notifications/overview/
- **API Changelog:** See `docs/API_CHANGELOG.md`
- **Mobile Developer Essential Guide:** See `docs/MOBILE_DEVELOPER_ESSENTIAL_GUIDE.md`

---

## Support

For API support and questions:
- **Email:** dev@patricktravel.com
- **Slack:** #mobile-dev-support
- **Documentation Issues:** Create issue in repository

---

**Document Version:** 1.0  
**Last Updated:** October 19, 2025  
**Maintained By:** Backend Team

