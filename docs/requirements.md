You are an expert full-stack developer tasked with building a complete, production-ready immigration services management platform called Patrick Travel Services. This is a dual-platform system: a mobile app for clients and a web application for the company. Follow these specifications precisely:

PROJECT ARCHITECTURE OVERVIEW
Platform Division

Mobile App (Client-facing): React Native/Expo for iOS and Android

Client registration and authentication
Case submission and tracking
Document upload and management
Messaging with advisors
Notifications


Web Application (Company-facing): React + Tailwind CSS + shadcn + tanstack Query 

Public landing page with company information
Authentication for agents/administrators
Complete back-office management system
Case and client management
Statistics and reporting dashboard


Shared Backend API: Node.js + TypeScript + supabase

Single unified API serving both platforms
Role-based access control



TECHNICAL STACK
Backend (Shared API)

NextJs 15+ API Route and Expo Api route + supabase

Frontend - Web Application

Framework: NextJS 15+, React & React Dom latest 
Language: TypeScript
Styling: Tailwind CSS
NextJs navigation
State Management: React Context API + Zustand
HTTP Client: Axios with interceptors
Form Handling: ShadCn UI
UI Components: Headless UI or shadcn/ui : https://ui.shadcn.com/docs/components
Charts: Recharts or Chart.js
File Upload: react-dropzone + cloudinary or uploadThings
Notifications: shadcn sonner
Date Handling: date-fns

Frontend - Mobile Application

Framework: React Native + Expo
Language: TypeScript
Navigation: expo Navigation 
State Management: React Context API +  Zustand
HTTP Client: Axios with interceptors
Forms: React Hook Form
UI Library: React Native Paper or NativeBase
Icons: expo-vector-icons
File Upload: expo-document-picker, expo-image-picker
Push Notifications: expo-notifications/email
Secure Storage: expo-secure-store (for tokens)

Database

PostgreSQL with:

Proper foreign key relationships
Indexes on frequently queried fields
UID primary keys
Timestamps (created_at, updated_at)
Soft deletes where appropriate



USER ROLES & PERMISSIONS
1. Client Role (Mobile App Only)
Capabilities:

Register and authenticate
Complete profile
Submit immigration cases
Upload required documents
Track case status in real-time
Communicate with assigned advisor via messaging (chat/email)
Receive push notifications
View document checklist
Access FAQ and guides

2. Agent/Advisor Role (Web App)
Capabilities:

Authenticate via web interface
View assigned cases
Update case status
Review and verify documents
Communicate with clients via messaging
Request additional documents
Add internal notes to cases
View client information

3. Administrator Role (Web App)
Capabilities:

All agent capabilities PLUS:
Manage all users (clients, agents, admins)
Assign cases to agents
Configure system settings
Access comprehensive analytics and statistics
Manage service types and document requirements
View audit logs
Export reports
Manage FAQ and documentation content

FUNCTIONAL MODULES

MOBILE APP MODULES
Module 1: Onboarding & Authentication
Screens:

Splash screen with logo
Onboarding carousel (3-4 slides explaining services)
Registration screen:

Full name, email, phone, password, confirm password

Terms acceptance checkbox
Email verification flow


Login screen:

Email/password
Remember me option
Forgot password link


Password recovery flow
Phone verification (optional SMS OTP)

Features:

Biometric authentication (Face ID/Touch ID) after initial login (optional and at the end of implementation)
Secure token storage 
Auto-login on app restart

Module 2: Client Dashboard
Screens:

Home/Dashboard:

Welcome message with user name
Quick stats cards (active cases, pending documents, unread messages)
Recent activity timeline
Quick action buttons


Profile screen:

View/edit personal information
Change password
Notification preferences
Language selection (if multilingual)
Logout option



Module 3: Case Management
Screens:

My Cases list:

Filter by status (all, active, completed, rejected)
Search by case reference
Sort by date


Case details:

Service type and reference number
Current status with visual progress indicator
Timeline of status changes
Assigned advisor information
Required documents checklist
Submitted documents list
Action buttons (upload document, message advisor)



Module 4: New Case Submission
Screens:

Service type selection (cards with icons)
Multi-step form wizard:

Personal information
Service-specific questions
Document upload interface
Review and submit


Document camera/gallery picker
File preview before upload
Submission confirmation

Features:

Form validation with error messages
Draft auto-save
Progress indicator
File size and type validation
Multiple file upload support

Module 5: Document Center
Screens:

All documents organized by case
Upload new documents
Document preview (PDF viewer, image viewer)
Download documents
Document status (pending review, approved, rejected)

Module 6: Messaging
Screens:

Conversations list (grouped by case)
Chat interface with advisor
File attachment support
Message search
Typing indicators
Read receipts

Features:

Real-time messaging using supabase realtime
Push notifications for new messages with FCM + expo
Image/document sharing
Message history

Module 7: Notifications
Screens:

Notification center
Filter by type (case updates, messages, system)
Mark as read/unread
Clear all

Module 8: Help & Support
Screens:

FAQ with categories and search
Contact support form
Live chat (optional)
Document templates and guides
Tutorial videos (optional)

========

WEB APPLICATION MODULES
Module 1: Public Landing Page
Sections:

Navigation bar (logo, services, about, testimonials, contact, login/register for agents)
Hero section:

Compelling headline
Subheading
CTA buttons (Download App, Contact Us)
Hero image/illustration


Services section:

Grid of services with icons
Brief descriptions
"Learn More" links


About Us section
Testimonials carousel with client photos/avatars
Statistics section (clients served, success rate, countries)
How It Works section (step-by-step process)
Contact form:

Name, email, phone, service interested, message
Map integration (optional)


Footer:

Contact information
Social media links
Quick links
Newsletter signup (optional)



Module 2: Agent/Admin Authentication
Pages:

Login page (separate from public site):

Email/password
Remember me
Forgot password


Password recovery
First-time password setup

Features:

Session management
Auto-logout on inactivity
Secure cookie-based sessions

Module 3: Admin Dashboard
Layout:

Sidebar navigation
Top bar with user menu and notifications
Main content area

Dashboard Widgets:

Key metrics cards:

Total clients
Active cases
Pending reviews
Completed this month


Cases by status (pie/donut chart)
Cases by service type (bar chart)
Recent activity feed
Quick actions panel
Revenue metrics (optional)
Upcoming deadlines calendar

Module 4: Client Management
Pages:

Clients list:

Table with pagination : 
Search and filters (status, date registered, service type)
Actions (view, edit, deactivate)


Client details:

Personal information
All cases associated
Document history
Communication history
Activity log
Notes section



Features:

Export client list (CSV/Excel)
Bulk actions
Advanced filters

Module 5: Case Management
Pages:

Cases list:

Advanced filtering (status, agent, date range, service type)
Search by reference or client name
Sort by date, priority, status
Column customization


Case details:

Client information card
Case information (reference, service type, submission date)
Status update interface with dropdown
Timeline visualization
Documents section:

View/download documents
Approve/reject documents
Request additional documents


Messages/chat with client
Internal notes (visible to agents/admins only)
Assigned agent
Action buttons (update status, message client, close case)



Features:

Bulk status updates
Case assignment to agents
Priority flagging
Export case reports
Print case summary

Module 6: Document Management
Pages:

All documents view with filters
Document verification interface
Document templates library (for admin to upload)

Features:

Document approval workflow
Bulk download
Document expiry tracking (if applicable)

Module 7: Messaging Center
Pages:

Inbox with conversations or Real-time chat interface
Conversation history
Filter by client/case

Features:

Real-time messaging using  supabase realtime or Socket.io 
File sharing
Canned responses library
Conversation assignment

Module 8: Analytics & Reports
Pages:

Statistics dashboard:

Time-based trends (daily, weekly, monthly)
Conversion funnel
Agent performance metrics
Service popularity
Geographic distribution (if applicable)


Custom report builder
Export reports (PDF, Excel)

Visualizations:

Line charts for trends
Pie charts for distributions
Bar charts for comparisons
Heatmaps for activity patterns

Module 9: System Configuration
Pages:

User management (agents/admins):

Add/edit/deactivate users
Role assignment
Permissions management


Service types configuration:

Add/edit services
Define document requirements per service
Set processing timelines


Email templates editor:

Welcome email
Status update notifications
Password reset
Document request


Notification settings:

Email/SMS toggles
Notification triggers


General settings:

Company information
Contact details
Business hours
Supported languages



Module 10: FAQ & Content Management
Pages:

FAQ management (CRUD operations)
Category management
Document templates upload/management
Guide creation with rich text editor

Module 11: Audit Logs
Pages:

Activity log viewer:

User actions
Login history
Data modifications
Filter by user, action type, date range


Export logs

SECURITY & GDPR COMPLIANCE
Security Measures

Authentication & Authorization:

typescript   // JWT token structure
   interface JWTPayload {
     userId: string;
     email: string;
     role: 'client' | 'agent' | 'admin';
     iat: number;
     exp: number;
   }
   
   // Middleware for role-based access
   - authenticateToken middleware
   - authorizeRoles(['admin', 'agent']) middleware

Data Protection:

Hash passwords with bcrypt (salt rounds: 12)
Encrypt sensitive data at rest (files, personal info)
HTTPS only in production
Secure headers with Helmet.js
CORS whitelist for web and mobile origins


Input Validation:

Validate all inputs with Joi/Zod schemas
Sanitize inputs to prevent XSS
Parameterized queries to prevent SQL injection
File upload validation (type, size, content)


Rate Limiting:

typescript   // Authentication endpoints: 5 requests per 15 minutes
   // General API: 100 requests per 15 minutes
   // File upload: 10 requests per hour

Session Management:

Access token expiry: 15 minutes
Refresh token expiry: 7 days
Token refresh mechanism
Logout invalidates tokens
Session timeout after 30 minutes inactivity (web)


File Security:

Scan uploaded files for malware (ClamAV integration optional)
Store files with randomized names
Separate storage buckets by file type
Pre-signed URLs for temporary access


Logging & Monitoring:

Log all authentication attempts
Log all data modifications with user info
Log all file uploads/downloads
Monitor failed login attempts (account lockout after 5 attempts)
Error tracking with Sentry (optional)



GDPR Compliance

Consent Management:

Explicit consent checkbox during registration
Privacy policy and terms of service acceptance
Cookie consent (web only)
Granular consent for different data processing purposes


User Rights:

Right to Access: Export all personal data in JSON format
Right to Rectification: Edit profile information
Right to Erasure: Delete account functionality
Right to Restriction: Deactivate account temporarily
Right to Portability: Download data in structured format


Data Minimization:

Only collect necessary information
Optional fields clearly marked
Regular data cleanup of inactive accounts


Data Retention:

Define retention periods per data type:

Active cases: Until completion + 1 year
Completed cases: 5 years
Inactive accounts: 2 years before anonymization


Automated cleanup jobs
Secure deletion procedures


Privacy by Design:

Pseudonymization where possible
Separate PII storage
Access controls on personal data
Audit trail for data access


Data Processing Records:

Document all data processing activities
List third-party processors (email service, cloud storage)
Data processing agreements with vendors


Breach Notification:

Detection mechanism for data breaches
Notification procedure (users within 72 hours)
Incident response plan



DATABASE SCHEMA
Core Models (Prisma Schema)
// User Model
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  password          String    // hashed
  firstName         String
  lastName          String
  phone             String?
  role              Role      @default(CLIENT)
  isActive          Boolean   @default(true)
  isVerified        Boolean   @default(false)
  verificationToken String?
  resetToken        String?
  resetTokenExpiry  DateTime?
  lastLogin         DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  cases             Case[]    @relation("ClientCases")
  assignedCases     Case[]    @relation("AgentCases")
  sentMessages      Message[] @relation("SentMessages")
  receivedMessages  Message[] @relation("ReceivedMessages")
  documents         Document[]
  notifications     Notification[]
  activityLogs      ActivityLog[]
  
  @@index([email])
  @@index([role])
}

enum Role {
  CLIENT
  AGENT
  ADMIN
}

// Case Model
model Case {
  id               String       @id @default(uuid())
  referenceNumber  String       @unique
  clientId         String
  client           User         @relation("ClientCases", fields: [clientId], references: [id])
  assignedAgentId  String?
  assignedAgent    User?        @relation("AgentCases", fields: [assignedAgentId], references: [id])
  serviceType      ServiceType
  status           CaseStatus   @default(SUBMITTED)
  priority         Priority     @default(NORMAL)
  submissionDate   DateTime     @default(now())
  lastUpdated      DateTime     @updatedAt
  internalNotes    String?      @db.Text
  estimatedCompletion DateTime?
  
  // Relations
  documents        Document[]
  messages         Message[]
  statusHistory    StatusHistory[]
  notifications    Notification[]
  formData         CaseFormData?
  
  @@index([clientId])
  @@index([assignedAgentId])
  @@index([status])
  @@index([serviceType])
  @@index([referenceNumber])
}

enum ServiceType {
  STUDENT_VISA
  WORK_PERMIT
  FAMILY_REUNIFICATION
  TOURIST_VISA
  BUSINESS_VISA
  PERMANENT_RESIDENCY
}

enum CaseStatus {
  SUBMITTED
  UNDER_REVIEW
  DOCUMENTS_REQUIRED
  PROCESSING
  APPROVED
  REJECTED
  CLOSED
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}

// CaseFormData Model (JSON field for dynamic form data)
model CaseFormData {
  id       String @id @default(uuid())
  caseId   String @unique
  case     Case   @relation(fields: [caseId], references: [id], onDelete: Cascade)
  data     Json   // Flexible JSON structure for different service types
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// StatusHistory Model (for timeline tracking)
model StatusHistory {
  id          String     @id @default(uuid())
  caseId      String
  case        Case       @relation(fields: [caseId], references: [id], onDelete: Cascade)
  status      CaseStatus
  changedBy   String
  notes       String?
  timestamp   DateTime   @default(now())
  
  @@index([caseId])
  @@index([timestamp])
}

// Document Model
model Document {
  id            String         @id @default(uuid())
  caseId        String
  case          Case           @relation(fields: [caseId], references: [id], onDelete: Cascade)
  uploadedById  String
  uploadedBy    User           @relation(fields: [uploadedById], references: [id])
  fileName      String
  originalName  String
  filePath      String
  fileSize      Int
  mimeType      String
  documentType  DocumentType
  status        DocumentStatus @default(PENDING)
  uploadDate    DateTime       @default(now())
  verifiedBy    String?
  verifiedAt    DateTime?
  rejectionReason String?
  
  @@index([caseId])
  @@index([status])
}

enum DocumentType {
  PASSPORT
  ID_CARD
  BIRTH_CERTIFICATE
  MARRIAGE_CERTIFICATE
  DIPLOMA
  EMPLOYMENT_LETTER
  BANK_STATEMENT
  PROOF_OF_RESIDENCE
  PHOTO
  OTHER
}

enum DocumentStatus {
  PENDING
  APPROVED
  REJECTED
}

// Message Model
model Message {
  id          String   @id @default(uuid())
  senderId    String
  sender      User     @relation("SentMessages", fields: [senderId], references: [id])
  recipientId String
  recipient   User     @relation("ReceivedMessages", fields: [recipientId], references: [id])
  caseId      String?
  case        Case?    @relation(fields: [caseId], references: [id])
  subject     String?
  content     String   @db.Text
  isRead      Boolean  @default(false)
  readAt      DateTime?
  sentAt      DateTime @default(now())
  attachments Json?    // Array of file references
  
  @@index([senderId])
  @@index([recipientId])
  @@index([caseId])
  @@index([isRead])
}

// Notification Model
model Notification {
  id               String           @id @default(uuid())
  userId           String
  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  caseId           String?
  case             Case?            @relation(fields: [caseId], references: [id])
  type             NotificationType
  title            String
  message          String
  isRead           Boolean          @default(false)
  readAt           DateTime?
  createdAt        DateTime         @default(now())
  actionUrl        String?
  
  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
}

enum NotificationType {
  CASE_STATUS_UPDATE
  NEW_MESSAGE
  DOCUMENT_UPLOADED
  DOCUMENT_VERIFIED
  DOCUMENT_REJECTED
  CASE_ASSIGNED
  SYSTEM_ANNOUNCEMENT
}

// ActivityLog Model
model ActivityLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  action      String
  description String
  ipAddress   String?
  userAgent   String?
  metadata    Json?
  timestamp   DateTime @default(now())
  
  @@index([userId])
  @@index([timestamp])
  @@index([action])
}

// FAQ Model
model FAQ {
  id          String   @id @default(uuid())
  question    String
  answer      String   @db.Text
  category    String
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([category])
  @@index([isActive])
}

// DocumentTemplate Model
model DocumentTemplate {
  id          String   @id @default(uuid())
  name        String
  description String?
  filePath    String
  fileSize    Int
  category    String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// SystemSetting Model
model SystemSetting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String   @db.Text
  category  String
  updatedAt DateTime @updatedAt
  updatedBy String
  
  @@index([key])
  @@index([category])
}


API ENDPOINTS STRUCTURE
Base URL

Development: development_URL
Production: product_URL

// Authentication Endpoints
POST   /auth/register              // Register new client (mobile)
POST   /auth/login                 // Login (mobile & web)
POST   /auth/logout                // Logout
POST   /auth/refresh-token         // Refresh access token
POST   /auth/verify-email          // Verify email with token
POST   /auth/resend-verification   // Resend verification email
POST   /auth/forgot-password       // Request password reset
POST   /auth/reset-password        // Reset password with token
GET    /auth/me                    // Get current user info

// User Management Endpoints
// Client endpoints (mobile & web)
GET    /users/profile              // Get own profile
PUT    /users/profile              // Update own profile
PUT    /users/password             // Change password
DELETE /users/account              // Delete account (GDPR)
GET    /users/data-export          // Export personal data (GDPR)

// Admin endpoints (web only)
GET    /admin/users                // List all users with filters
GET    /admin/users/:id            // Get user details
PUT    /admin/users/:id            // Update user
DELETE /admin/users/:id            // Deactivate user
POST   /admin/users                // Create agent/admin user
GET    /admin/users/:id/activity   // User activity log

// Case Management Endpoints
// Client endpoints (mobile)
GET    /cases                      // Get user's cases
POST   /cases                      // Submit new case
GET    /cases/:id                  // Get case details
PUT    /cases/:id                  // Update case (draft only)

// Agent/Admin endpoints (web)
GET    /admin/cases                // List all cases with filters
GET    /admin/cases/:id            // Get case details
PATCH  /admin/cases/:id/status     // Update case status
PATCH  /admin/cases/:id/assign     // Assign case to agent
PUT    /admin/cases/:id/notes      // Update internal notes
PATCH  /admin/cases/:id/priority   // Update priority
GET    /admin/cases/:id/history    // Get status history
DELETE /admin/cases/:id            // Delete case (soft delete)

Document Endpoints
// Client endpoints (mobile)
GET    /cases/:caseId/documents              // List case documents
POST   /cases/:caseId/documents              // Upload document
GET    /documents/:id/download               // Download document
DELETE /documents/:id                        // Delete document (if not verified)

// Agent/Admin endpoints (web)
PATCH  /admin/documents/:id/verify           // Approve document
PATCH  /admin/documents/:id/reject           // Reject document
GET    /admin/documents                      // List all documents with filters
POST   /admin/cases/:caseId/request-document // Request additional document

// Message Endpoints
GET    /messages                    // List conversations
POST   /messages                    // Send message
GET    /messages/:id                // Get message details
PATCH  /messages/:id/read           // Mark as read
DELETE /messages/:id                // Delete message
GET    /cases/:caseId/messages      // Get case messages

// Notification Endpoints
GET    /notifications               // List user notifications (includes unreadCount in response)
PUT    /notifications/[id]          // Mark notification as read
PUT    /notifications/mark-all-read // Mark all as read
DELETE /notifications/[id]          // Delete notification

// Statistics Endpoints (Admin only - web)
GET    /admin/statistics/overview           // Dashboard overview stats
GET    /admin/statistics/cases-by-status    // Cases grouped by status
GET    /admin/statistics/cases-by-service   // Cases by service type
GET    /admin/statistics/cases-trend        // Time-based trends
GET    /admin/statistics/agent-performance  // Agent metrics
POST   /admin/statistics/custom-report      // Generate custom report

//FAQ Endpoints
GET    /faq                         // Public FAQ list
GET    /faq/categories              // FAQ categories

// Admin endpoints
POST   /admin/faq                   // Create FAQ
PUT    /admin/faq/:id               // Update FAQ
DELETE /admin/faq/:id               // Delete FAQ
PATCH  /admin/faq/:id/reorder       // Reorder FAQs

// System Configuration Endpoints (Admin only - web)
GET    /admin/settings              // Get all settings
PUT    /admin/settings/:key         // Update setting

POST   /admin/service-types         // Create service type
PUT    /admin/service-types/:id     // Update service type
GET    /admin/document-templates    // List templates
POST   /admin/document-templates    // Upload template
DELETE /admin/document-templates/:id // Delete template

// Activity Log Endpoints (Admin only - web)
GET    /admin/activity-logs         // List activity logs with filters
GET    /admin/activity-logs/export  // Export logs

// Contact Form Endpoint (Public - web)
POST   /contact                     // Submit contact form from landing page

// Health Check

### images

for the app, you may use images from images/. (the images are name accordingly)