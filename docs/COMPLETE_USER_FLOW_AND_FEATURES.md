# Complete User Flow & Features - Patrick Travel Services Mobile App

**Document Version:** 1.0  
**Last Updated:** November 2, 2025  
**Status:** Production Ready ✅

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Complete User Journey](#complete-user-journey)
3. [All Features & Functionalities](#all-features--functionalities)
4. [User Flow Diagrams](#user-flow-diagrams)
5. [Technical Implementation Summary](#technical-implementation-summary)
6. [App Architecture](#app-architecture)

---

## Overview

Patrick Travel Services is a comprehensive immigration case management mobile application that enables clients to submit immigration cases, upload documents, communicate with advisors, and track their case progress in real-time.

### Key Highlights

- **Platform:** React Native + Expo (iOS & Android)
- **Authentication:** Firebase Auth + Google OAuth
- **Backend:** Next.js REST API + PostgreSQL + Firebase Realtime Database
- **Real-time Features:** Chat, Push Notifications, Live Updates
- **Compliance:** GDPR Compliant
- **Languages:** English & French (i18n)
- **Themes:** Light & Dark Mode Support

---

## Complete User Journey

### Phase 1: First Launch & Onboarding (Day 1)

#### 1.1 App Launch
- User downloads and opens the app for the first time
- App checks if onboarding was completed (stored in AsyncStorage)
- If not completed, redirects to onboarding screen

#### 1.2 Onboarding Experience
**Screen:** `app/onboarding.tsx`

**Features:**
- 5 beautiful slides explaining app features:
  1. Welcome slide
  2. Case Management overview
  3. Document Upload explanation
  4. Real-time Chat with advisors
  5. Notifications & Updates
- Smooth animations with pagination dots
- Skip functionality (can skip at any time)
- "Get Started" button on final slide
- Completion flag saved to AsyncStorage (never shows again unless app is reinstalled)

**User Actions:**
- Swipe or tap to navigate slides
- Tap "Skip" to jump to registration
- Tap "Get Started" to proceed to registration

---

### Phase 2: Registration & Authentication (Day 1)

#### 2.1 Account Registration
**Screen:** `features/auth/screens/RegisterScreen.tsx`

**Registration Form:**
- Email address (validated)
- Password (with strength requirements)
- Password confirmation (must match)
- First Name
- Last Name
- Phone Number (optional)
- Terms & Conditions checkbox (required, with link)
- Privacy Policy checkbox (required, with link)
- GDPR consent timestamp recorded

**Process:**
1. User fills registration form
2. Validates all fields (email format, password strength, matching passwords)
3. Checks both consent checkboxes
4. Submits to backend: `POST /api/auth/register`
5. Backend creates Firebase user + PostgreSQL record
6. Consent timestamps saved: `consentedAt`, `acceptedTerms`, `acceptedPrivacy`
7. Redirects to email verification screen

**GDPR Compliance:**
- ✅ Consent explicitly recorded with timestamps
- ✅ Terms & Privacy Policy must be accepted
- ✅ User can view full privacy policy and terms before accepting

#### 2.2 Email Verification
**Screen:** `app/(auth)/verify-email.tsx`

**Process:**
1. Firebase sends verification email automatically
2. User receives email with verification link
3. User clicks link → Email verified in Firebase
4. User can also use "Resend Verification" button if email not received
5. Must verify email before accessing app features

**Features:**
- Email input with validation
- Resend verification button with inline loader
- Success/error feedback messages
- "Go to Login" button after verification

#### 2.3 Login
**Screen:** `features/auth/screens/LoginScreen.tsx`

**Login Methods:**
1. **Email/Password Login:**
   - Email and password input
   - "Remember Me" checkbox for session persistence
   - Inline loading spinner (button doesn't disappear)
   - Forgot password link

2. **Google OAuth Login:**
   - "Continue with Google" button
   - Native Google sign-in flow
   - Auto-creates account if new user

3. **Biometric Login** (Optional, if enabled):
   - Face ID (iOS) / Fingerprint (Android) button appears
   - One-tap login after initial setup
   - Secure credential storage in device keychain

**Process:**
1. User enters credentials or uses biometric/Google
2. Firebase authenticates user
3. Axios interceptor adds Firebase ID token to API requests
4. Backend verifies token and syncs user: `POST /api/auth/login`
5. Session stored in SecureStorage (persists across app restarts)
6. Push notification token registered automatically
7. Navigates to home dashboard

**Security:**
- ✅ Tokens stored in encrypted SecureStorage
- ✅ Auto-refresh expired tokens
- ✅ Session persists across app restarts
- ✅ Auto-logout on invalid tokens

---

### Phase 3: Profile Completion & First Steps (Day 1-2)

#### 3.1 Dashboard (Home Screen)
**Screen:** `app/(tabs)/index.tsx`

**First-Time User Experience:**
- Personalized greeting: "Welcome, [FirstName]!"
- Profile completion banner (if profile incomplete)
- Empty state with "Create Your First Case" CTA

**Dashboard Features:**
- **Stats Cards:**
  - Total Cases count
  - Active Cases count
  - Pending Documents count
  - Unread Messages count
- **Quick Actions:**
  - "Submit New Case" button
  - "Upload Document" button (disabled if no active cases)
  - "View FAQs" button
- **Recent Activity:**
  - Timeline of recent case updates
  - Recent notifications preview
- **Pull-to-Refresh:** Refresh all data

**Account States & Permissions:**
- **PENDING_VERIFICATION:** Can only view FAQ, Contact Support
- **INCOMPLETE_PROFILE:** Can view dashboard but must complete profile to create cases
- **ACTIVE:** Can create cases and use all features
- **HAS_ACTIVE_CASE:** Can upload documents and message advisors

#### 3.2 Profile Completion
**Screen:** `app/profile/edit.tsx`

**Required Fields:**
- First Name ✅
- Last Name ✅
- Email (pre-filled, cannot change)
- Phone Number ⚠️ (required for case creation)

**Process:**
1. User sees profile completion prompt if missing phone
2. Navigates to Edit Profile screen
3. Fills missing information
4. Saves profile: `PATCH /api/users/profile`
5. Account state updates: `INCOMPLETE_PROFILE` → `ACTIVE`
6. Now can create cases

---

### Phase 4: Case Creation & Submission (Day 2-7)

#### 4.1 Browse Services & FAQs
**Screen:** `app/help/faq.tsx`

**Before Creating a Case:**
- User can browse FAQ to understand services
- Search functionality (debounced, 300ms)
- Categories: General, Cases, Documents, Payments, etc.
- Accordion-style Q&A display
- Always accessible (even before verification)

#### 4.2 Create New Case
**Screen:** `app/case/new.tsx`

**Prerequisites:**
- ✅ Email verified
- ✅ Profile completed (phone number required)

**Process:**
1. **Service Type Selection:**
   - Cards display: Student Visa, Work Permit, Family Reunification, Tourist Visa, Business Visa, Permanent Residency
   - Each card shows icon and description
   - User selects desired service

2. **Case Form Wizard:**
   - Multi-step form with progress indicator
   - **Step 1:** Personal Information
   - **Step 2:** Service-Specific Questions (destination, travel dates, etc.)
   - **Step 3:** Document Checklist (shows required documents)
   - **Step 4:** Review & Submit

3. **Validation:**
   - All required fields validated
   - Prevents duplicate service type cases (can only have one active case per service type)
   - Shows existing case if user tries to create duplicate

4. **Submission:**
   - Submits to backend: `POST /api/cases`
   - System generates unique reference number (e.g., "PTS-2025-001234")
   - Case status: `SUBMITTED`
   - Success screen with reference number
   - Shows next steps:
     - "Agent will be assigned within 24-48 hours"
     - "You'll receive a notification when documents are required"
     - "You can message your agent once assigned"

**Business Rules:**
- ✅ One active case per service type (prevents duplicates)
- ✅ Case must have reference number
- ✅ Cannot edit case after submission (only draft cases can be edited)

---

### Phase 5: Agent Assignment & Chat Initialization (Day 3-7)

#### 5.1 Agent Assignment Process

**Backend Process (Automatic):**
1. Admin assigns case to agent via web dashboard
2. **Multiple notification channels triggered:**
   - ✅ Agent receives web dashboard notification
   - ✅ Client receives web dashboard notification (if using web)
   - ✅ Client receives mobile push notification
   - ✅ Client receives email with advisor details
   - ✅ Firebase chat conversation initialized automatically
   - ✅ Optional welcome message sent from agent

**Mobile App Experience:**
- User receives push notification:
  > "👤 Case Assigned! Your case PTS-2025-001234 has been assigned to John Smith. They will contact you soon."
- Tapping notification navigates to case details
- Notification badge updates

#### 5.2 Case Details Screen
**Screen:** `app/case/[id].tsx`

**When Agent is Assigned (Chat Available):**
- ✅ Highlighted advisor section with primary color background
- ✅ Advisor name displayed: "Advisor: John Smith"
- ✅ Green badge: "✅ Chat available"
- ✅ "Message Advisor" button enabled
- ✅ Hint text: "💬 Chat with your advisor anytime"

**When No Agent (Chat Not Available):**
- ⏳ Warning-colored section: "Awaiting Advisor Assignment"
- Helper text: "Your case is being reviewed. An advisor will be assigned within 24-48 hours"
- Disabled chat section with dashed border
- Icon and message: "Chat Not Available Yet"
- Description: "Chat will be available once an advisor is assigned. You'll receive a notification."

**Case Information Display:**
- Reference number (prominent)
- Service type with icon
- Current status with color-coded badge
- Submission date
- Last updated timestamp
- Status timeline visualization
- Required documents checklist
- Submitted documents list

---

### Phase 6: Document Upload & Management (Day 8-21)

#### 6.1 View Required Documents
**Screen:** `app/case/[id].tsx` (Case Details)

**Document Checklist:**
- Shows all required documents for the service type
- Each document marked as:
  - ❌ **MISSING:** Not uploaded yet
  - ⏳ **PENDING:** Uploaded, awaiting review
  - ✅ **APPROVED:** Verified by agent
  - ❌ **REJECTED:** Needs re-upload (reason provided)

**Features:**
- Document type icons
- Status badges with colors
- File size and upload date for submitted documents
- Rejection reason displayed if document rejected

#### 6.2 Upload Documents
**Screen:** `app/document/upload.tsx`

**Prerequisites:**
- ✅ Must have at least one active case
- ✅ Case must not be CLOSED or REJECTED

**Upload Process:**
1. **Case Selection:**
   - If multiple active cases: Shows case picker
   - If single case: Auto-selects it
   - User-friendly display: "PTS-2025-001234 - Student Visa"

2. **Document Type Selection:**
   - Dropdown/picker with document types:
     - Passport, ID Card, Birth Certificate, Marriage Certificate
     - Diploma, Employment Letter, Bank Statement
     - Proof of Residence, Photo, Other
   - Validates document type is relevant to service type

3. **File Selection (3 Options):**
   - **📷 Camera:** Take photo directly
   - **🖼️ Gallery:** Select from photo library
   - **📄 Document:** Pick PDF or document file

4. **File Validation:**
   - Max file size: 10MB per file
   - Max files per case: 20 documents
   - Allowed types: PDF, JPG, PNG
   - Validates before upload

5. **Upload with Progress:**
   - Shows upload progress bar with percentage
   - Image compression (80% quality for photos)
   - Uploads to backend: `POST /api/documents` (multipart/form-data)
   - Saves to UploadThing cloud storage
   - Document status: `PENDING`

6. **Success:**
   - Document appears in case documents list
   - Notification sent to assigned agent
   - User can upload more documents

**Business Rules:**
- ❌ Cannot upload without active case
- ❌ Cannot upload to closed cases
- ✅ Can upload multiple documents of same type (agent can choose best one)
- ✅ Can replace rejected documents

#### 6.3 Documents List
**Screen:** `app/(tabs)/documents.tsx`

**Features:**
- Lists all documents across all cases
- Filter by:
  - Case (dropdown)
  - Document Type
  - Status (Pending, Approved, Rejected)
- Search by document name
- Sort by date (newest first, oldest first)
- Document cards show:
  - Document type icon
  - Original file name
  - Case reference number
  - Status badge
  - Upload date
  - File size
- Tap document → Preview/download
- Pull-to-refresh

**Performance Optimizations:**
- ✅ Debounced search (300ms)
- ✅ Memoized filtered results
- ✅ Optimized FlatList rendering
- ✅ Pagination (20 items per page)

#### 6.4 Document Review Process

**Agent Review (Backend):**
1. Agent reviews document on web dashboard
2. Agent can:
   - ✅ Approve document
   - ❌ Reject document (with reason)

**Client Notification:**
- User receives push notification:
  - **Approved:** "✅ Your passport document has been approved"
  - **Rejected:** "❌ Your diploma document needs re-upload. Reason: [reason]"
- Email notification also sent
- Document status updates in real-time

**After All Documents Approved:**
- Case status changes: `DOCUMENTS_REQUIRED` → `PROCESSING`
- User receives notification: "📋 All documents approved! Your case is now being processed."

---

### Phase 7: Real-Time Communication (Throughout Process)

#### 7.1 Chat List
**Screen:** `app/(tabs)/messages.tsx`

**Features:**
- Lists all conversations (grouped by case)
- Each conversation shows:
  - Case reference number
  - Advisor/Client name
  - Last message preview
  - Timestamp (Today, Yesterday, or date)
  - Unread message badge (red dot with count)
- Tap conversation → Opens chat room
- Pull-to-refresh
- Empty state if no conversations

#### 7.2 Chat Room
**Screen:** `app/message/[id].tsx`

**Prerequisites:**
- ✅ Agent must be assigned to case
- ✅ Case must not be CLOSED

**Real-Time Chat Features:**
- **Message Display:**
  - WhatsApp-style message bubbles
  - Sent messages: Right-aligned (primary color)
  - Received messages: Left-aligned (gray)
  - Timestamp for each message
  - Read receipts (✓✓ when read)

- **Message Input:**
  - Multi-line text input
  - Send button (enabled when text entered)
  - Typing indicator: "Agent is typing..."
  - Online/offline status

- **Real-Time Updates:**
  - Uses Firebase Realtime Database (< 100ms latency)
  - Messages appear instantly
  - Auto-scrolls to latest message
  - Mark as read automatically when chat opened

- **Message History:**
  - Loads last 100 messages
  - Infinite scroll for older messages
  - Messages persist across sessions

**Message Sending Process:**
1. User types message
2. Taps send button
3. Message sent to Firebase Realtime Database
4. Also saved to PostgreSQL via API: `POST /api/chat/messages`
5. Push notification sent to recipient
6. Message appears in chat immediately

**Message Read Functionality:**
- ✅ Automatic read marking when chat opened
- ✅ API endpoint: `PUT /api/chat/messages/{id}/read`
- ✅ Batch read marking: `PUT /api/chat/messages/mark-read`
- ✅ Dual sync: Firebase (real-time) + PostgreSQL (persistent)

#### 7.3 Email Communication
**Screen:** `app/(tabs)/messages.tsx` → Email tab

**Features:**
- Separate email inbox from chat
- Lists all emails (received and sent)
- Filter by direction: Incoming, Outgoing
- Email cards show:
  - Subject line
  - Sender/Recipient name
  - Preview text
  - Sent/Received date
  - Unread badge

#### 7.4 Email Reader
**Screen:** `app/email/[id].tsx`

**Features:**
- Full email display
- Reply button (if received email)
- Email metadata (from, to, date, subject)
- Full content display
- Thread ID tracking for replies

#### 7.5 Email Reply
**Screen:** `app/email/[id].tsx` → Reply modal

**Process:**
1. User taps "Reply" button on received email
2. Modal slides up from bottom
3. Subject auto-prefixed: "Re: [Original Subject]"
4. User types reply message
5. Sends via: `POST /api/emails/send`
6. Reply saved and sent to agent
7. Success toast notification
8. Email list refreshes

**Validation:**
- ✅ Email must be received (not sent by user)
- ✅ Email must have caseId
- ✅ Reply text cannot be empty

---

### Phase 8: Notifications & Updates (Throughout Process)

#### 8.1 Notification Center
**Screen:** `app/(tabs)/notifications.tsx`

**Notification Types:**
- **CASE_STATUS_UPDATE:** "Your case PTS-2025-001234 status changed to PROCESSING"
- **NEW_MESSAGE:** "New message from John Smith"
- **DOCUMENT_UPLOADED:** "Document uploaded successfully"
- **DOCUMENT_VERIFIED:** "Your passport document has been approved"
- **DOCUMENT_REJECTED:** "Your diploma document needs re-upload"
- **CASE_ASSIGNED:** "Case assigned to John Smith"
- **SYSTEM_ANNOUNCEMENT:** System-wide updates

**Features:**
- Lists all notifications (paginated)
- Filter by type
- Unread badge count
- Mark as read (single or all)
- Tap notification → Navigates to relevant screen
- Pull-to-refresh
- Empty state when no notifications

**Notification Management:**
- ✅ Mark single as read: `PUT /api/notifications/{id}`
- ✅ Mark all as read: `PUT /api/notifications/mark-all-read`
- ✅ Get unread count: Included in GET /api/notifications response

#### 8.2 Push Notifications

**Setup:**
- Auto-registered on login
- Token saved: `PUT /api/users/push-token`
- 4 notification channels (Android):
  - Default
  - Case Updates
  - Messages
  - Documents

**Notification Handling:**
- Foreground: In-app banner/alert
- Background: System notification
- Deep linking: Tapping notification navigates to relevant screen
- Badge count updates automatically

#### 8.3 Case Update Monitoring
**Service:** `lib/hooks/useCaseUpdates.ts`

**Fallback Mechanism:**
- Polls for case updates every 5 minutes in background
- Immediately checks when app returns to foreground
- Detects:
  - New agent assignments
  - Case status changes
- Sends local notifications if changes detected
- Acts as safety net if push notifications fail

---

### Phase 9: Case Processing & Status Updates (Day 22-60)

#### 9.1 Case Status Flow

**Status Progression:**
1. **SUBMITTED** → User submits case
2. **UNDER_REVIEW** → Agent reviews case
3. **DOCUMENTS_REQUIRED** → Agent requests documents
4. **PROCESSING** → All documents approved, case being processed
5. **APPROVED** → Case approved successfully
6. **REJECTED** → Case denied (with reason)
7. **CLOSED** → Case archived (after 30 days of approval)

#### 9.2 Status Timeline
**Screen:** `app/case/[id].tsx`

**Visual Timeline:**
- Color-coded status dots
- Connected timeline with dates
- Status change notes
- Shows who changed status (agent name)
- Animations on status updates

#### 9.3 Additional Document Requests

**Process:**
1. Agent reviews case during processing
2. Agent requests additional documents
3. Case status: `PROCESSING` → `DOCUMENTS_REQUIRED`
4. User receives notification
5. User uploads additional documents (same process as Phase 6)
6. After all documents approved, returns to `PROCESSING`

#### 9.4 Final Decision

**Approval:**
- Status: `PROCESSING` → `APPROVED`
- User receives notification with congratulations
- Next steps provided in notification
- Case details show approval date

**Rejection:**
- Status: `PROCESSING` → `REJECTED`
- User receives notification with rejection reason
- Appeal process explained
- Case details show rejection reason and date

---

### Phase 10: Case Completion & Follow-up (Day 61+)

#### 10.1 Case Closure
- After 30 days of approval, case status: `APPROVED` → `CLOSED`
- User can still view case history
- Documents remain accessible
- Chat conversation archived (read-only)

#### 10.2 New Case Creation
- User can create new case (same process as Phase 4)
- Different service type or same type after closure
- Process repeats from Phase 4

#### 10.3 Account Management

**Profile Settings**
**Screen:** `app/profile/settings.tsx`

**Features:**
- **Biometric Authentication:**
  - Toggle to enable/disable Face ID/Fingerprint
  - Only visible if device supports biometrics

- **Notification Preferences:**
  - Toggle push notifications
  - Toggle email notifications
  - Configure notification types

- **Language Settings:**
  - English / French toggle
  - Preference persists

- **Theme Settings:**
  - Light / Dark / Auto toggle
  - Preference persists

**Privacy & GDPR**
**Screen:** `app/(tabs)/profile.tsx` → Privacy section

**Features:**
- **View Privacy Policy:** Full GDPR-compliant privacy policy
- **View Terms & Conditions:** Complete terms of service
- **Export Data:** Download all personal data (JSON format)
- **Delete Account:**
  - Shows confirmation dialog
  - Validates no active cases
  - 30-day grace period
  - Permanent deletion after grace period

**GDPR Rights Implemented:**
- ✅ Right to Access: View all profile data
- ✅ Right to Rectification: Edit profile information
- ✅ Right to Erasure: Delete account with grace period
- ✅ Right to Data Portability: Export all data as JSON
- ✅ Right to be Informed: Privacy Policy & Terms accessible
- ✅ Consent Management: Consent recorded with timestamps

---

## All Features & Functionalities

### Authentication & Security

#### ✅ Firebase Authentication
- Email/password authentication
- Google OAuth 2.0 integration
- Secure token storage (expo-secure-store)
- Automatic token refresh
- Session persistence across app restarts
- Biometric authentication (Face ID/Touch ID/Fingerprint)
- Remember me functionality

#### ✅ Security Features
- Encrypted credential storage
- HTTPS-only API communication
- Input validation (Zod schemas)
- XSS and SQL injection protection
- Rate limiting on API
- Secure push token management

### Case Management

#### ✅ Case Creation
- Service type selection (6 types)
- Multi-step form wizard
- Case reference number generation
- Duplicate prevention (one active case per service type)
- Draft auto-save
- Form validation

#### ✅ Case Tracking
- Real-time status updates
- Visual status timeline
- Status history with dates
- Case details with all information
- Document checklist per case
- Advisor assignment tracking

#### ✅ Case List
- Filter by status
- Search by reference number
- Sort by date
- Pull-to-refresh
- Empty states
- Animated cards

### Document Management

#### ✅ Document Upload
- Camera integration
- Gallery selection
- Document picker (PDF)
- File validation (size, type)
- Upload progress tracking
- Image compression (80% quality)
- Multiple file support

#### ✅ Document Organization
- Documents grouped by case
- Document type categorization
- Status tracking (Pending, Approved, Rejected)
- File preview
- Download functionality
- Document history

#### ✅ Document Review
- Real-time status updates
- Rejection reasons display
- Re-upload functionality
- Document replacement

### Communication

#### ✅ Real-Time Chat
- Firebase Realtime Database integration
- WhatsApp-style message UI
- Typing indicators
- Online/offline status
- Read receipts
- Message history
- Auto-read marking
- File attachments support (planned)

#### ✅ Email Communication
- Email inbox
- Email reader
- Reply functionality
- Thread tracking
- Email notifications
- Sent/received tracking

### Notifications

#### ✅ Push Notifications
- Expo push notifications
- FCM integration (Android)
- APNs integration (iOS)
- 4 notification channels
- Deep linking
- Badge count management
- Foreground/background handling

#### ✅ In-App Notifications
- Notification center
- Notification types (7 types)
- Mark as read functionality
- Unread badge count
- Notification filtering
- Pull-to-refresh

#### ✅ Email Notifications
- Case assignment emails
- Status update emails
- Document approval/rejection emails
- Professional HTML templates

### User Profile & Settings

#### ✅ Profile Management
- View/edit profile
- Avatar upload
- Phone number management
- Password change
- Account information

#### ✅ Settings
- Biometric authentication toggle
- Notification preferences
- Language selection (EN/FR)
- Theme selection (Light/Dark/Auto)
- Privacy settings

#### ✅ GDPR Compliance
- Privacy Policy access
- Terms & Conditions access
- Data export functionality
- Account deletion (30-day grace period)
- Consent tracking with timestamps

### Help & Support

#### ✅ FAQ System
- Categorized FAQs
- Search functionality (debounced)
- Accordion-style display
- Always accessible

#### ✅ Contact Support
- Contact form
- Email integration
- Support request tracking

### Performance & UX

#### ✅ Performance Optimizations
- Debounced search (300ms)
- Memoized calculations
- Optimized FlatList rendering
- Request caching (React Query)
- Image compression
- Pagination (20 items per page)
- Lazy loading

#### ✅ Animations
- Smooth screen transitions
- Card animations (FadeInDown)
- Loading spinners
- Pull-to-refresh animations
- Status badge animations

#### ✅ Offline Support
- Request caching
- Firebase offline support (automatic)
- Network status detection
- Graceful degradation
- Offline queue (planned)

### Internationalization

#### ✅ Multi-Language Support
- English (default)
- French (complete translations)
- Language switcher in settings
- Preference persistence
- All UI text translated

### Accessibility

#### ✅ Cross-Platform Support
- iOS (13.4+)
- Android (6.0+)
- Safe area handling (notches, punch holes)
- Keyboard avoidance
- Platform-specific optimizations

---

## User Flow Diagrams

### Complete Journey Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE USER JOURNEY                         │
└─────────────────────────────────────────────────────────────────┘

DAY 1: Registration & Setup
┌──────────────┐
│  App Launch  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Onboarding  │ (5 slides, skip option)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Registration │ → Terms & Privacy consent → Email verification
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Login     │ → Email/Password OR Google OR Biometric
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Dashboard   │ → Complete profile (if needed)
└──────┬───────┘

DAY 2-7: Case Creation
       │
       ▼
┌──────────────┐
│ Browse FAQs  │ (Optional - learn about services)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Create Case  │ → Select service → Fill form → Submit
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Case Details │ → Status: SUBMITTED → "Awaiting Assignment"
└──────┬───────┘

DAY 3-7: Agent Assignment
       │
       ▼
┌─────────────────┐
│ Agent Assigned  │ ← Push notification + Email + Chat initialized
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Case Details   │ → "Chat Available" → "Message Advisor" enabled
└────────┬────────┘

DAY 8-21: Document Submission
         │
         ▼
┌─────────────────┐
│ Upload Docs     │ → Select case → Select type → Upload → PENDING
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent Reviews   │ → APPROVED or REJECTED (with reason)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ All Docs Done   │ → Status: DOCUMENTS_REQUIRED → PROCESSING
└────────┬────────┘

DAY 22-60: Processing
         │
         ▼
┌─────────────────┐
│   Processing    │ → Status updates → Chat with advisor → Additional docs (if needed)
└────────┬────────┘
         │
         │
    ┌────┴────┐
    │         │
    ▼         ▼
APPROVED   REJECTED
    │         │
    │         └→ Appeal process
    │
    ▼
┌─────────────────┐
│   Case Closed   │ (After 30 days)
└─────────────────┘

ONGOING: Communication
    │
    ├─→ Real-Time Chat (Firebase)
    ├─→ Email Messages
    ├─→ Push Notifications
    └─→ In-App Notifications
```

### Case Creation Flow

```
User taps "Create Case"
    │
    ▼
Check Prerequisites
    ├─ Email verified? ──→ NO → Redirect to verify email
    └─ Profile complete? ──→ NO → Redirect to complete profile
    │
    ▼ YES
Show Service Type Selection
    │
    ▼
User selects service type
    │
    ▼
Check for duplicate
    ├─ Active case of same type? ──→ YES → Show alert → View existing or cancel
    └─ NO
    │
    ▼
Show Multi-Step Form
    ├─ Step 1: Personal Info
    ├─ Step 2: Service Questions
    ├─ Step 3: Document Checklist
    └─ Step 4: Review
    │
    ▼
User submits case
    │
    ▼
POST /api/cases
    │
    ▼
Case created → Reference number generated
    │
    ▼
Show success screen
    │
    ├─ Reference number displayed
    ├─ Next steps explained
    └─ "View Case" button
```

### Document Upload Flow

```
User taps "Upload Document"
    │
    ▼
Check Prerequisites
    ├─ Has active cases? ──→ NO → Alert → Redirect to create case
    └─ YES
    │
    ▼
Show Case Selector (if multiple cases)
    │
    ▼
User selects case
    │
    ▼
Check case status
    ├─ Case CLOSED? ──→ YES → Show error "Cannot upload to closed case"
    └─ NO
    │
    ▼
Show Document Type Picker
    │
    ▼
User selects document type
    │
    ▼
Show Upload Options
    ├─ Camera
    ├─ Gallery
    └─ Document Picker
    │
    ▼
User selects/picks file
    │
    ▼
Validate File
    ├─ Size > 10MB? ──→ YES → Show error
    ├─ Invalid type? ──→ YES → Show error
    └─ Valid
    │
    ▼
Compress Image (if photo, 80% quality)
    │
    ▼
Show Upload Progress
    │
    ▼
POST /api/documents (multipart/form-data)
    │
    ▼
Document uploaded → Status: PENDING
    │
    ▼
Show success → Refresh documents list
```

### Chat Flow

```
User taps "Message Advisor" (on case details)
    │
    ▼
Check Prerequisites
    ├─ Agent assigned? ──→ NO → Show "Agent not yet assigned"
    ├─ Case CLOSED? ──→ YES → Show "Cannot message on closed case"
    └─ Valid
    │
    ▼
Open Chat Screen
    │
    ▼
Load Chat History
    ├─ Subscribe to Firebase Realtime Database
    ├─ Load last 100 messages
    └─ Mark all messages as read (auto)
    │
    ▼
User types message
    │
    ▼
Send Message
    ├─ Save to Firebase Realtime Database
    ├─ Save to PostgreSQL via API
    ├─ Send push notification to recipient
    └─ Update UI immediately
    │
    ▼
Real-time Updates
    ├─ New messages appear instantly (< 100ms)
    ├─ Typing indicators shown
    ├─ Read receipts update
    └─ Online/offline status updates
```

---

## Technical Implementation Summary

### Architecture

```
Mobile App (React Native + Expo)
    │
    ├─ Firebase Auth (Authentication)
    │
    ├─ REST API (Next.js Backend)
    │   ├─ PostgreSQL (Cases, Documents, Users, Messages)
    │   └─ UploadThing (File Storage)
    │
    └─ Firebase Realtime Database (Real-time Chat)
```

### Key Technologies

- **Framework:** React Native + Expo SDK 54
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based routing)
- **State Management:** Zustand + React Query
- **UI Library:** React Native Paper + Custom Components
- **Animations:** React Native Reanimated
- **Forms:** React Hook Form + Zod
- **Authentication:** Firebase Auth + Google OAuth
- **Real-time:** Firebase Realtime Database
- **Push Notifications:** Expo Notifications + FCM
- **Storage:** Expo SecureStore + AsyncStorage

### API Endpoints Used

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and sync user
- `GET /api/auth/me` - Get current user

#### Cases
- `GET /api/cases` - List user's cases
- `POST /api/cases` - Create new case
- `GET /api/cases/{id}` - Get case details

#### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `GET /api/documents/{id}` - Get document details

#### Messages/Chat
- `GET /api/messages` - List conversations
- `POST /api/chat/messages` - Send message
- `PUT /api/chat/messages/{id}/read` - Mark as read
- `PUT /api/chat/messages/mark-read` - Batch mark as read

#### Emails
- `GET /api/emails` - List emails
- `POST /api/emails/send` - Send email
- `GET /api/emails/{id}` - Get email details

#### Notifications
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/{id}` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read

#### User Profile
- `GET /api/users/profile` - Get profile
- `PATCH /api/users/profile` - Update profile
- `PUT /api/users/push-token` - Register push token
- `GET /api/users/data-export` - Export data (GDPR)
- `DELETE /api/users/account` - Delete account (GDPR)

### Data Models

#### User
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CLIENT' | 'AGENT' | 'ADMIN';
  isVerified: boolean;
  consentedAt: string; // GDPR
  acceptedTerms: boolean; // GDPR
  acceptedPrivacy: boolean; // GDPR
}
```

#### Case
```typescript
{
  id: string;
  referenceNumber: string;
  serviceType: 'STUDENT_VISA' | 'WORK_PERMIT' | ...;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'PROCESSING' | 'APPROVED' | ...;
  assignedAgentId?: string;
  submissionDate: Date;
  lastUpdated: Date;
}
```

#### Document
```typescript
{
  id: string;
  caseId: string;
  documentType: 'PASSPORT' | 'DIPLOMA' | ...;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  fileName: string;
  filePath: string;
  uploadDate: Date;
  rejectionReason?: string;
}
```

---

## App Architecture

### Folder Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── verify-email.tsx
│   │   ├── privacy-policy.tsx
│   │   └── terms.tsx
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Dashboard
│   │   ├── cases.tsx
│   │   ├── documents.tsx
│   │   ├── messages.tsx
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   ├── case/
│   │   ├── [id].tsx       # Case details
│   │   └── new.tsx        # Create case
│   ├── document/
│   │   └── upload.tsx
│   ├── message/
│   │   └── [id].tsx       # Chat room
│   ├── email/
│   │   └── [id].tsx       # Email reader
│   └── onboarding.tsx
├── components/
│   └── ui/                # Reusable UI components
├── features/
│   └── auth/              # Authentication features
├── lib/
│   ├── api/               # API client & endpoints
│   ├── services/          # Business logic services
│   ├── hooks/             # Custom React hooks
│   ├── i18n/              # Internationalization
│   └── types/             # TypeScript types
├── stores/                # Zustand state stores
└── docs/                  # Documentation
```

### State Management

- **Zustand Stores:**
  - `authStore` - Authentication state
  - `casesStore` - Cases state
  - `documentsStore` - Documents state
  - `notificationsStore` - Notifications state

- **React Query:**
  - API data caching
  - Automatic refetching
  - Pagination handling
  - Optimistic updates

### Key Services

- `lib/services/auth.ts` - Authentication logic
- `lib/services/chat.ts` - Chat/Real-time messaging
- `lib/services/pushNotifications.ts` - Push notification handling
- `lib/services/notifications.ts` - In-app notifications
- `lib/services/biometricAuth.ts` - Biometric authentication
- `lib/api/axios.ts` - API client with interceptors

---

## Summary

This document provides a complete overview of:

1. ✅ **Complete User Journey** - From app launch to case completion
2. ✅ **All Features & Functionalities** - Comprehensive feature list
3. ✅ **User Flow Diagrams** - Visual representation of key flows
4. ✅ **Technical Implementation** - Architecture and technologies used
5. ✅ **API Integration** - All endpoints and data models

The app is **production-ready** with all core features implemented, GDPR compliance, multi-language support, and a complete user experience from onboarding through case completion.

---

**Document Status:** ✅ Complete  
**Last Updated:** November 2, 2025  
**Maintained by:** Development Team

