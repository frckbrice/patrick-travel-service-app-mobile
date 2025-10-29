# Email API Implementation

**Date:** October 26, 2025  
**Status:** ✅ **COMPLETED**  
**Backend Integration:** `/api/emails/send`

---

## 📋 Overview

The mobile app now fully integrates with the backend email API for sending emails via SMTP. The implementation follows the backend API specification with role-based behavior.

---

## 🎯 API Endpoint

**Endpoint:** `POST /api/emails/send`  
**Authentication:** Required (Firebase ID Token via axios interceptor)

### Request Body

```typescript
interface SendEmailInput {
  recipientId?: string;    // Required for AGENT/ADMIN, optional for CLIENT
  caseId?: string;         // REQUIRED for CLIENT, optional for AGENT/ADMIN
  subject: string;         // Required
  content: string;         // Required (renamed from body)
  attachments?: EmailAttachment[]; // Optional
}

interface EmailAttachment {
  id?: string;
  url: string;
  name: string;
  size: number;
  type: string;
}
```

### Response

```typescript
interface EmailResponse {
  success: boolean;
  data: {
    message: {
      id: string;              // Message UUID
      subject: string;          // Email subject
      recipientName: string;   // Full name of recipient
      sentAt: string;          // ISO timestamp
      threadId: string;        // Unique email thread identifier
    };
  };
  message: string;
}
```

---

## 👥 Role-Based Behavior

### CLIENT Role
- **Required:** `caseId`
- **recipientId:** Auto-resolved from case's assigned agent
- **caseId validation:** Client must own the case

**Example:**
```typescript
await sendEmail({
  caseId: 'case-id-123',
  subject: 'Question about my case',
  content: 'I have a question...',
});
```

### AGENT/ADMIN Role
- **Required:** `recipientId`
- **Optional:** `caseId` (to attach to a case)
- Must specify the recipient directly

**Example:**
```typescript
await sendEmail({
  recipientId: 'user-id-456',
  caseId: 'case-id-123', // optional
  subject: 'Response to inquiry',
  content: 'Thank you for your question...',
});
```

---

## 🔧 Implementation Files

### 1. Email Service (`lib/services/email.ts`)

Core email service with methods:
- `sendEmail(input: SendEmailInput): Promise<EmailResponse | null>`
- `sendMessageToAdvisor(caseId, subject, message, attachments?)`
- `sendEmailToRecipient(recipientId, subject, message, caseId?, attachments?)`
- `sendContactForm(data: ContactFormData)`

### 2. Email API (`lib/api/email.api.ts`)

Direct API function:
- `sendEmail(input: SendEmailInput): Promise<EmailResponse | null>`
- Helper: `sendContactForm()`
- Helper: `documentToAttachment()`

### 3. React Hook (`lib/hooks/useSendEmail.ts`)

React Query mutation hook with built-in toast notifications:
- `useSendEmail()` - General email sending hook
- `useSendEmailToAdvisor(caseId)` - Client-specific hook
- `useSendEmailToRecipient(recipientId)` - Agent/Admin-specific hook

---

## 📱 Usage Examples

### Example 1: Using the Hook (Recommended)

```tsx
import { useSendEmail } from '@/lib/hooks';
import { useAuth } from '@/features/auth/hooks/useAuth';

function EmailComponent({ caseId }: { caseId: string }) {
  const { user } = useAuth();
  const sendEmail = useSendEmail();

  const handleSend = async () => {
    try {
      await sendEmail.mutateAsync({
        caseId, // CLIENT role
        subject: 'Re: Case Inquiry',
        content: 'Thank you for your inquiry...',
        attachments: [{
          url: 'https://storage.example.com/doc.pdf',
          name: 'document.pdf',
          size: 1024,
          type: 'application/pdf'
        }]
      });
      // Success handled automatically via toast notification
    } catch (error) {
      // Error handled automatically via toast notification
    }
  };

  return (
    <Button 
      onPress={handleSend}
      loading={sendEmail.isPending}
    >
      Send Email
    </Button>
  );
}
```

### Example 2: Using Role-Specific Hooks

```tsx
// For CLIENT role
import { useSendEmailToAdvisor } from '@/lib/hooks';

function ClientEmailComponent({ caseId }: { caseId: string }) {
  const { sendEmail, isLoading } = useSendEmailToAdvisor(caseId);

  const handleSend = async () => {
    await sendEmail(
      'Question about my case',
      'I would like to know the status...'
    );
  };

  return <Button onPress={handleSend} loading={isLoading}>Send to Advisor</Button>;
}
```

```tsx
// For AGENT/ADMIN role
import { useSendEmailToRecipient } from '@/lib/hooks';

function AgentEmailComponent({ recipientId }: { recipientId: string }) {
  const { sendEmail, isLoading } = useSendEmailToRecipient(recipientId);

  const handleSend = async () => {
    await sendEmail(
      'Response to your inquiry',
      'Thank you for your question...',
      'case-id-123' // optional: attach to case
    );
  };

  return <Button onPress={handleSend} loading={isLoading}>Send to Client</Button>;
}
```

### Example 3: Using Service Directly

```tsx
import { emailService } from '@/lib/services/email';

// For CLIENT role
const result = await emailService.sendMessageToAdvisor(
  'case-id-123',
  'Question about my case',
  'I have a question...'
);

// For AGENT/ADMIN role
const result = await emailService.sendEmailToRecipient(
  'user-id-456',
  'Response to inquiry',
  'Thank you for your question...',
  'case-id-123' // optional
);

if (result) {
  console.log('Email sent!', {
    messageId: result.data.message.id,
    threadId: result.data.message.threadId,
  });
}
```

---

## 🛡️ Error Handling

The implementation handles all API error cases:

| Status | Error | Response |
|--------|-------|----------|
| **400** | Validation Error | "Subject is required" |
| **401** | Unauthorized | "Unauthorized - please login again" |
| **403** | Forbidden | "Unauthorized access to case" |
| **404** | Not Found | "Case not found" or "Recipient not found" |
| **500** | Server Error | "Server error - email service is temporarily unavailable" |

**Automatic Toast Notifications:**
- ✅ Success: Shows recipient name
- ❌ Error: Shows user-friendly error message

---

## 📎 Attachment Support

Attachments can be included with emails:

```typescript
const attachment: EmailAttachment = {
  id: 'doc-123', // optional
  url: 'https://storage.example.com/document.pdf',
  name: 'my-document.pdf',
  size: 102400, // bytes
  type: 'application/pdf'
};

await sendEmail({
  caseId: 'case-id-123',
  subject: 'Document submission',
  content: 'Please find attached document.',
  attachments: [attachment]
});
```

### Helper Function

Convert a document to attachment format:

```typescript
import { documentToAttachment } from '@/lib/api/email.api';

const attachment = documentToAttachment({
  url: document.url,
  name: document.name,
  size: document.size,
  type: document.type,
  id: document.id
});
```

---

## 🔐 Authentication

The Firebase ID Token is automatically added by the axios interceptor (`lib/api/axios.ts`). No manual authentication required.

**Headers:**
```
Authorization: Bearer <Firebase_ID_Token>
Content-Type: application/json
```

---

## 🧪 Testing

### Test with CLI (Backend Required)

```bash
# Set environment variables
export FIREBASE_ID_TOKEN="your-token"

# For CLIENT role
curl -X POST http://localhost:3000/api/emails/send \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caseId": "case-id-123",
    "subject": "Test Email",
    "content": "This is a test email from mobile app"
  }'

# For AGENT/ADMIN role
curl -X POST http://localhost:3000/api/emails/send \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user-id-456",
    "subject": "Test Email",
    "content": "This is a test email from agent"
  }'
```

---

## 📊 Features

✅ **Role-Based Email Sending**
- CLIENT: caseId → auto-resolve agent
- AGENT/ADMIN: recipientId required

✅ **Attachment Support**
- URL-based attachments
- File metadata (name, size, type)

✅ **Thread Tracking**
- Unique threadId for reply tracking
- Message history maintained

✅ **Automatic Notifications**
- Backend creates notification for recipient
- Database message record created

✅ **Error Handling**
- Comprehensive error logging
- User-friendly error messages
- Toast notifications

✅ **React Query Integration**
- Optimistic updates
- Query invalidation
- Loading/error states

---

## 🚀 Production Readiness

- ✅ API endpoint configured: `POST /api/emails/send`
- ✅ Authentication via Firebase token
- ✅ Role-based behavior implemented
- ✅ Error handling complete
- ✅ Toast notifications integrated
- ✅ TypeScript types defined
- ✅ Logging implemented
- ✅ Documentation complete

---

## 📖 Email Reading Functionality

**Date:** October 2025  
**Status:** ✅ **COMPLETED**

### Overview

The mobile app now fully supports reading email messages with complete API integration for fetching individual emails and managing read status (single and batch operations).

---

### API Endpoints

#### 1. Get Single Email
**Endpoint:** `GET /api/emails/{id}`  
**Authentication:** Required (Firebase ID Token)

**Response:**
```typescript
interface EmailResponse {
  success: boolean;
  data: {
    email: {
      id: string;
      subject: string;
      content: string;
      senderId: string;
      recipientId: string;
      sender: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
      recipient: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
      sentAt: string; // ISO timestamp
      isRead: boolean;
      readAt: string | null; // ISO timestamp
      caseId: string | null;
      case: {
        id: string;
        caseNumber: string;
        serviceType: string;
      } | null;
      attachments: {
        id: string;
        fileName: string;
        url: string;
        mimeType: string;
        fileSize: number;
      }[];
      threadId: string;
    };
  };
  message: string;
}
```

#### 2. Mark Single Email as Read
**Endpoint:** `PUT /api/emails/{id}/read`  
**Authentication:** Required

**Response:**
```typescript
interface MarkReadResponse {
  success: boolean;
  data: {
    email: {
      id: string;
      isRead: true;
      readAt: string; // ISO timestamp
    };
  };
  message: string;
}
```

**Authorization:** Only the email recipient can mark it as read.

#### 3. List Emails with Filters
**Endpoint:** `GET /api/emails?page=1&limit=20&caseId={id}&isRead=true`  
**Authentication:** Required

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `caseId` (string, optional): Filter by case ID
- `isRead` (boolean, optional): Filter by read status

**Response:**
```typescript
interface EmailsListResponse {
  success: boolean;
  data: {
    emails: Email[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

#### 4. Mark Multiple Emails as Read (Batch)
**Endpoint:** `PUT /api/emails/mark-read`  
**Authentication:** Required

**Request Body:**
```typescript
{
  emailIds: string[]; // Array of email IDs (max 100)
}
```

**Response:**
```typescript
interface BatchMarkReadResponse {
  success: boolean;
  data: {
    count: number; // Number of emails marked as read
  };
  message: string;
}
```

---

### Implementation Files

#### 1. Messages API (`lib/api/messages.api.ts`)

**Methods Added:**
- `getEmail(id: string)` - Get single email message
- `markEmailAsRead(id: string)` - Mark single email as read
- `getEmails(page, pageSize, filters?)` - List emails with pagination and filters
- `markEmailsAsRead(emailIds: string[])` - Mark multiple emails as read

**Example Usage:**
```typescript
import { messagesApi } from '@/lib/api/messages.api';

// Get single email
const result = await messagesApi.getEmail('email-id-123');
if (result.success && result.data) {
  console.log('Email:', result.data.subject);
}

// Mark as read
const markResult = await messagesApi.markEmailAsRead('email-id-123');
if (markResult.success) {
  console.log('Email marked as read');
}

// List emails
const emailsResult = await messagesApi.getEmails(1, 20, {
  caseId: 'case-id-123',
  isRead: false,
});

// Mark multiple as read
const batchResult = await messagesApi.markEmailsAsRead(['id1', 'id2', 'id3']);
```

#### 2. Email Reader Screen (`app/email/[id].tsx`)

**Features:**
- ✅ Full email display with sender information
- ✅ Automatic read marking when email is opened
- ✅ Attachment download support
- ✅ Related case navigation
- ✅ Loading and error states
- ✅ Internationalization support

**Key Functions:**
- `loadEmail()` - Fetches email data from API
- `markAsRead()` - Automatically marks email as read when opened
- `downloadAttachment()` - Downloads and shares attachment files

---

### Email Reader Integration

#### Navigation
```typescript
import { router } from 'expo-router';

// Navigate to email reader
router.push(`/email/${emailId}`);
```

#### Auto Mark as Read
When a user opens an email, it's automatically marked as read:
```typescript
useEffect(() => {
  if (email && !email.isRead) {
    markAsRead();
  }
}, [email, markAsRead]);
```

---

### Error Handling

| Status | Error | Response |
|--------|-------|----------|
| **401** | Unauthorized | "Unauthorized - please login again" |
| **403** | Forbidden | "You can only mark emails sent to you as read" |
| **404** | Not Found | "Email not found" |
| **400** | Invalid Request | "Invalid email IDs provided" |
| **500** | Server Error | "Server error - unable to load email" |

---

### Features

✅ **Email Reading**
- Full email content display
- Sender/recipient information
- Timestamp formatting (today, yesterday, date)
- Related case linking
- Attachment support

✅ **Read Status Management**
- Single email mark as read
- Batch mark as read (up to 100 emails)
- Automatic read marking on open
- Real-time read status updates

✅ **API Integration**
- Complete backend API integration
- Proper error handling
- TypeScript type safety
- Comprehensive logging

✅ **User Experience**
- Loading states
- Error messages
- Attachment downloads
- Navigation to related cases
- Internationalization

---

## 📝 Notes

1. **Backend SMTP Configuration:** The backend must be configured with SMTP settings in the .env file (lines 56-61) as mentioned by the user.

2. **No Direct SMTP:** The mobile app does NOT send emails directly via SMTP. All emails are sent through the backend API, which handles SMTP configuration.

3. **Token Management:** Firebase ID Token is automatically included in requests by the axios interceptor. No manual token handling required.

4. **Thread ID:** The backend returns a `threadId` for tracking email conversations. This enables reply functionality.

5. **Contact Form:** The `/contact` endpoint remains separate for general inquiries (not role-specific).

6. **Email Reading:** All email read operations are handled via REST API endpoints, ensuring persistent read status across devices.

7. **Batch Operations:** Mark up to 100 emails as read in a single API call for improved performance.

---

**Implementation completed by:** Senior Mobile Developer  
**Date:** October 2025  
**Integration status:** ✅ Ready for production  
**Email Reading:** ✅ Fully Implemented
