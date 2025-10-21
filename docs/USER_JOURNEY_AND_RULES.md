# User Journey & Business Rules
**Patrick Travel Services - Immigration Case Management**

---

## 📋 Table of Contents

1. [User Journey Overview](#user-journey-overview)
2. [Account States & Permissions](#account-states--permissions)
3. [Business Rules](#business-rules)
4. [User Flow Diagrams](#user-flow-diagrams)
5. [Implementation Guidelines](#implementation-guidelines)
6. [Error Prevention](#error-prevention)

---

## User Journey Overview

### Phase 1: Registration & Onboarding (Days 1-2)

```
Step 1: Download App
  ↓
Step 2: View Onboarding (First time only)
  ↓
Step 3: Create Account
  - Email, Password, Name, Phone
  - Accept Terms & Privacy Policy
  - GDPR consent timestamp recorded
  ↓
Step 4: Email Verification (MANDATORY)
  - Cannot access app features until verified
  - Can resend verification email
  - Must verify within 48 hours or account disabled
  ↓
Step 5: First Login
  - Biometric setup prompt (optional)
  - Welcome tour (optional skip)
  ↓
Step 6: Profile Completion
  - Add missing info (phone if not provided)
  - Set preferences (language, notifications)
  - Status: "INCOMPLETE_PROFILE" → "ACTIVE"
```

---

### Phase 2: Case Initiation (Days 3-7)

```
Step 1: User Reviews Services
  - Browse FAQ (no case needed)
  - Understand available services
  ↓
Step 2: Submit First Case
  - Select service type (STUDENT_VISA, WORK_PERMIT, etc.)
  - Provide basic information
  - System generates Case Reference Number
  - Case Status: SUBMITTED
  - User Status: "ACTIVE" → "HAS_ACTIVE_CASE"
  ↓
Step 3: Agent Assignment
  - Backend assigns agent (within 24 hours)
  - User receives notification
  - Chat becomes available with assigned agent
  ↓
Step 4: Document Requirements
  - Agent reviews case
  - Sets status: DOCUMENTS_REQUIRED
  - Provides list of required documents
  - User can now upload documents
```

---

### Phase 3: Document Submission (Days 8-21)

```
Step 1: View Required Documents
  - List shown in case details
  - Each document type marked (REQUIRED/OPTIONAL)
  ↓
Step 2: Upload Documents (ONLY for active cases)
  - RULE: Must have at least ONE case before uploading
  - Must select which case document belongs to
  - Must select document type (PASSPORT, DIPLOMA, etc.)
  - File size limit: 10MB
  - Allowed types: PDF, JPG, PNG
  - Document Status: PENDING
  ↓
Step 3: Document Review
  - Agent reviews documents (1-3 business days)
  - Status changes: PENDING → APPROVED/REJECTED
  - If REJECTED: reason provided, user can re-upload
  ↓
Step 4: Document Completion
  - All required documents APPROVED
  - Case status: DOCUMENTS_REQUIRED → PROCESSING
```

---

### Phase 4: Processing (Days 22-60)

```
Step 1: Case Processing
  - Agent processes application
  - Regular updates via notifications
  - User can message agent for questions
  - Status: PROCESSING
  ↓
Step 2: Additional Requirements (if needed)
  - Status: PROCESSING → DOCUMENTS_REQUIRED
  - User uploads additional documents
  - Return to Step 3 of Phase 3
  ↓
Step 3: Final Decision
  - Status: PROCESSING → APPROVED/REJECTED
  - User receives detailed notification
  - If APPROVED: Next steps provided
  - If REJECTED: Reasons explained, appeal process
```

---

### Phase 5: Completion & Follow-up (Day 61+)

```
Step 1: Case Closure
  - Status: APPROVED → CLOSED (after 30 days)
  - User can view case history
  - Documents remain accessible
  ↓
Step 2: New Case (Optional)
  - User can submit new case
  - Process repeats from Phase 2
  ↓
Step 3: Account Management
  - Export personal data (GDPR)
  - Delete account (with confirmation)
  - All cases must be CLOSED before deletion
```

---

## Account States & Permissions

### User Account States

```typescript
enum UserAccountState {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',  // Email not verified
  INCOMPLETE_PROFILE = 'INCOMPLETE_PROFILE',      // Missing required info
  ACTIVE = 'ACTIVE',                              // Can use app
  HAS_ACTIVE_CASE = 'HAS_ACTIVE_CASE',           // Has at least one non-closed case
  SUSPENDED = 'SUSPENDED',                        // Account locked by admin
  PENDING_DELETION = 'PENDING_DELETION',          // 30-day deletion grace period
  DELETED = 'DELETED'                             // Permanently deleted
}
```

### Permission Matrix

| Feature | PENDING_VERIFICATION | INCOMPLETE_PROFILE | ACTIVE | HAS_ACTIVE_CASE | SUSPENDED |
|---------|---------------------|-------------------|---------|-----------------|-----------|
| **View Dashboard** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Browse FAQ** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create Case** | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Upload Document** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Message Agent** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Edit Profile** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **View Cases** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **View Documents** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Contact Support** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Business Rules

### Rule 1: Email Verification Required
```typescript
if (!user.isVerified) {
  // Block access to:
  // - Dashboard
  // - Cases
  // - Documents
  // - Messages
  
  // Allow access to:
  // - FAQ
  // - Contact Support
  // - Profile (to update info)
  // - Resend Verification Email
}
```

### Rule 2: Profile Completion Required
```typescript
if (!user.phone || !user.firstName || !user.lastName) {
  accountState = 'INCOMPLETE_PROFILE';
  
  // Show banner: "Complete your profile to access all features"
  // Redirect to Profile Edit on dashboard load
  // Block case creation until complete
}
```

### Rule 3: Must Have Case Before Upload
```typescript
if (activeCases.length === 0) {
  // When user taps "Upload Document":
  Alert.alert(
    'No Active Case',
    'You must create a case before uploading documents. Would you like to create one now?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Create Case', onPress: () => router.push('/case/new') }
    ]
  );
  return; // Prevent navigation to upload screen
}
```

### Rule 4: Document Type Must Match Case
```typescript
// When uploading document:
if (!selectedCaseId) {
  throw new Error('Must select which case this document belongs to');
}

// Validate document type is relevant to service type
const allowedDocTypes = getRequiredDocumentsForService(case.serviceType);
if (!allowedDocTypes.includes(selectedDocumentType)) {
  Alert.alert('Invalid Document', 'This document type is not required for your case type');
}
```

### Rule 5: File Upload Limits
```typescript
const FILE_RULES = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxFilesPerCase: 20,
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
};

// Validation before upload:
if (file.size > FILE_RULES.maxSize) {
  Alert.alert('File Too Large', 'Maximum file size is 10MB');
  return;
}

if (caseDocuments.length >= FILE_RULES.maxFilesPerCase) {
  Alert.alert('Limit Reached', 'Maximum 20 documents per case');
  return;
}
```

### Rule 6: One Active Case Per Service Type
```typescript
// Prevent duplicate service type cases
const existingServiceCase = activeCases.find(
  c => c.serviceType === selectedServiceType && c.status !== 'CLOSED'
);

if (existingServiceCase) {
  Alert.alert(
    'Existing Case',
    `You already have an active ${SERVICE_TYPE_LABELS[selectedServiceType]} case (${existingServiceCase.referenceNumber}). Please complete or close it before creating a new one.`,
    [
      { text: 'View Case', onPress: () => router.push(`/case/${existingServiceCase.id}`) },
      { text: 'Cancel', style: 'cancel' }
    ]
  );
  return;
}
```

### Rule 7: Message Only Assigned Cases
```typescript
// Only allow messaging if:
// 1. Case exists
// 2. Agent is assigned
// 3. Case is not CLOSED

if (!case.assignedAgent) {
  Alert.alert(
    'Agent Not Assigned',
    'An agent will be assigned to your case within 24 hours. You will be notified when you can start messaging.'
  );
  return;
}

if (case.status === 'CLOSED') {
  Alert.alert(
    'Case Closed',
    'This case is closed. Please create a new case if you need further assistance.'
  );
  return;
}
```

### Rule 8: Account Deletion Rules
```typescript
// Before allowing account deletion:
const checks = {
  hasActiveCases: activeCases.length > 0,
  hasPendingDocuments: documents.some(d => d.status === 'PENDING'),
  hasUnreadMessages: unreadMessages > 0,
};

if (checks.hasActiveCases) {
  Alert.alert(
    'Cannot Delete Account',
    'You have active cases. Please close all cases before deleting your account.',
    [{ text: 'View Cases', onPress: () => router.push('/(tabs)/cases') }]
  );
  return;
}

if (checks.hasPendingDocuments) {
  Alert.alert(
    'Pending Documents',
    'You have documents awaiting review. Please wait for approval or withdraw your cases before deletion.'
  );
  return;
}

// Show final confirmation with 30-day grace period warning
```

---

## User Flow Diagrams

### Document Upload Flow

```
User taps "Upload Document"
  ↓
Check: Does user have any cases? ──→ NO → Show alert → Redirect to "Create Case"
  ↓ YES
Show case selection
  ↓
User selects case
  ↓
Check: Is case CLOSED? ──→ YES → Show error "Cannot upload to closed case"
  ↓ NO
Check: Does user have assigned agent? ──→ NO → Show info "Agent will be assigned soon"
  ↓ YES (Optional, can upload before agent)
Show document type selection
  ↓
User selects document type
  ↓
Check: Is this type already uploaded & approved? ──→ YES → Show warning "Already uploaded, want to replace?"
  ↓ NO or REPLACE
User picks file
  ↓
Validate file (size, type, extension)
  ↓
Upload to UploadThing with progress
  ↓
Save metadata to backend
  ↓
Show success → Redirect to Documents list
```

### Case Creation Flow

```
User taps "Create New Case"
  ↓
Check: Email verified? ──→ NO → Redirect to verify email
  ↓ YES
Check: Profile complete? ──→ NO → Redirect to complete profile
  ↓ YES
Show service type selection
  ↓
User selects service (STUDENT_VISA, etc.)
  ↓
Check: Already has active case of this type? ──→ YES → Show warning → Allow view existing or cancel
  ↓ NO
Show case form (destination, travel date, details)
  ↓
User fills form
  ↓
Validate inputs
  ↓
Submit to backend
  ↓
Show success with reference number
  ↓
Show next steps:
  - "Agent will be assigned within 24h"
  - "You'll be notified when documents are required"
  - "You can message your agent once assigned"
```

### First-Time User Journey

```
Day 1: Registration
  ├─► Create account
  ├─► Verify email (MUST complete)
  └─► Complete profile (if missing info)

Day 2-3: Case Creation
  ├─► Browse FAQ (learn about services)
  ├─► Create first case
  └─► Wait for agent assignment (auto, 24h max)

Day 4-7: Document Submission
  ├─► Receive "Documents Required" notification
  ├─► View required document list in case details
  ├─► Upload documents one by one
  └─► Agent reviews (1-3 business days each)

Day 8-60: Processing & Communication
  ├─► Message agent for questions
  ├─► Respond to additional document requests
  ├─► Receive status updates
  └─► Wait for final decision

Day 61+: Completion
  ├─► Case approved/rejected
  ├─► Case closed after 30 days
  ├─► Can create new case if needed
  └─► Can export/delete data (GDPR)
```

---

## Implementation Guidelines

### 1. Account Verification Guard

**File:** `features/auth/guards/useVerificationGuard.ts`

```typescript
import { useEffect } from 'react';
import { useAuthStore } from '../../../stores/auth/authStore';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

export const useVerificationGuard = () => {
  const user = useAuthStore(s => s.user);
  const router = useRouter();

  useEffect(() => {
    if (user && !user.isVerified) {
      Alert.alert(
        'Email Verification Required',
        'Please verify your email to access this feature.',
        [
          { text: 'Verify Now', onPress: () => router.push('/(auth)/verify-email') }
        ]
      );
    }
  }, [user]);

  return { isVerified: user?.isVerified || false };
};
```

### 2. Case Requirement Guard

**File:** `features/cases/guards/useCaseRequirementGuard.ts`

```typescript
import { useCasesStore } from '../../../stores/cases/casesStore';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export const useCaseRequirementGuard = () => {
  const cases = useCasesStore(s => s.cases);
  const router = useRouter();
  
  const activeCases = cases.filter(c => 
    c.status !== 'CLOSED' && c.status !== 'REJECTED'
  );

  const requiresActiveCase = (action: string) => {
    if (activeCases.length === 0) {
      Alert.alert(
        'No Active Case',
        `You must have an active case to ${action}. Would you like to create one now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Case', onPress: () => router.push('/case/new') }
        ]
      );
      return false;
    }
    return true;
  };

  return { 
    hasActiveCases: activeCases.length > 0,
    activeCases,
    requiresActiveCase 
  };
};
```

### 3. Profile Completion Guard

**File:** `features/auth/guards/useProfileCompletionGuard.ts`

```typescript
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../stores/auth/authStore';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export const useProfileCompletionGuard = () => {
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const [hasChecked, setHasChecked] = useState(false);

  const isProfileComplete = !!(
    user?.firstName &&
    user?.lastName &&
    user?.email &&
    user?.phone
  );

  useEffect(() => {
    if (!hasChecked && user && !isProfileComplete) {
      setHasChecked(true);
      Alert.alert(
        'Complete Your Profile',
        'Please add your phone number and other details to access all features.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Complete Now', onPress: () => router.push('/profile/edit') }
        ]
      );
    }
  }, [user, isProfileComplete, hasChecked]);

  return { isProfileComplete };
};
```

### 4. Document Upload Screen Updates

**File:** `app/document/upload.tsx`

```typescript
export default function UploadDocumentScreen() {
  const { hasActiveCases, activeCases, requiresActiveCase } = useCaseRequirementGuard();
  const { isVerified } = useVerificationGuard();

  useEffect(() => {
    // Guard: Must be verified and have active case
    if (!isVerified) {
      router.back();
      return;
    }
    
    if (!requiresActiveCase('upload documents')) {
      router.back();
      return;
    }
  }, [isVerified, hasActiveCases]);

  // Show case selector only if multiple active cases
  // Default to single active case if only one exists
}
```

### 5. Dashboard Conditional Rendering

**File:** `app/(tabs)/index.tsx`

```typescript
export default function HomeScreen() {
  const user = useAuthStore(s => s.user);
  const { hasActiveCases } = useCaseRequirementGuard();
  const { isProfileComplete } = useProfileCompletionGuard();

  return (
    <ScrollView>
      {/* Show profile completion banner */}
      {!isProfileComplete && (
        <Banner 
          message="Complete your profile to unlock all features"
          action="Complete Now"
          onPress={() => router.push('/profile/edit')}
        />
      )}

      {/* Show case creation CTA if no cases */}
      {!hasActiveCases && (
        <EmptyStateCTA
          title="Get Started"
          description="Create your first case to begin your immigration journey"
          action="Create Case"
          onPress={() => router.push('/case/new')}
        />
      )}

      {/* Regular dashboard if has cases */}
      {hasActiveCases && (
        <>
          <StatsCards />
          <QuickActions />
        </>
      )}
    </ScrollView>
  );
}
```

### 6. Navigation Guards

**File:** `lib/guards/navigationGuards.ts`

```typescript
export const navigationGuards = {
  '/case/new': (user, cases) => {
    if (!user.isVerified) return { 
      allowed: false, 
      redirect: '/(auth)/verify-email',
      message: 'Please verify your email first' 
    };
    
    if (!user.firstName || !user.phone) return {
      allowed: false,
      redirect: '/profile/edit',
      message: 'Please complete your profile first'
    };
    
    return { allowed: true };
  },

  '/document/upload': (user, cases) => {
    if (!user.isVerified) return { 
      allowed: false, 
      redirect: '/(auth)/verify-email' 
    };
    
    const activeCases = cases.filter(c => 
      c.status !== 'CLOSED' && c.status !== 'REJECTED'
    );
    
    if (activeCases.length === 0) return {
      allowed: false,
      redirect: '/case/new',
      message: 'Create a case first before uploading documents'
    };
    
    return { allowed: true };
  },

  '/message/[id]': (user, cases, caseId) => {
    const targetCase = cases.find(c => c.id === caseId);
    
    if (!targetCase) return { 
      allowed: false, 
      redirect: '/(tabs)/cases' 
    };
    
    if (!targetCase.assignedAgent) return {
      allowed: false,
      message: 'Agent not yet assigned. You will be notified when you can message.'
    };
    
    if (targetCase.status === 'CLOSED') return {
      allowed: false,
      message: 'Cannot message on closed cases'
    };
    
    return { allowed: true };
  }
};
```

---

## Error Prevention

### UI/UX Safeguards

**1. Disabled States**
```typescript
// Upload Document button on dashboard
<Button
  title="Upload Document"
  disabled={!hasActiveCases}
  onPress={handleUpload}
  icon={hasActiveCases ? 'cloud-upload' : 'lock'}
/>

{!hasActiveCases && (
  <HelperText>Create a case first to upload documents</HelperText>
)}
```

**2. Conditional Navigation**
```typescript
// Quick actions only show when allowed
{hasActiveCases && (
  <QuickActionButton
    title="Upload Document"
    onPress={() => router.push('/document/upload')}
  />
)}

{!hasActiveCases && (
  <QuickActionButton
    title="Create Your First Case"
    onPress={() => router.push('/case/new')}
    highlighted // Visual emphasis
  />
)}
```

**3. Informative Empty States**
```typescript
// Documents screen when no cases
if (!hasActiveCases) {
  return (
    <EmptyState
      icon="briefcase-outline"
      title="No Cases Yet"
      description="Documents are linked to cases. Create your first case to get started."
      actionText="Create Case"
      onAction={() => router.push('/case/new')}
    />
  );
}
```

**4. Progressive Disclosure**
```typescript
// Show features as user progresses
const availableFeatures = {
  viewFAQ: true, // Always available
  createCase: user.isVerified && isProfileComplete,
  uploadDocument: hasActiveCases,
  messageAgent: hasAssignedAgent,
  viewDocuments: hasActiveCases,
};
```

---

## Recommended Improvements

### 1. Add User State to Backend

```typescript
// Backend: Add accountState field to User model
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isVerified: boolean;
  isActive: boolean;
  accountState: UserAccountState; // NEW
  // ...
}
```

### 2. Add Case Requirements Endpoint

```typescript
// Backend: GET /api/cases/{caseId}/required-documents
Response: {
  "success": true,
  "data": {
    "required": [
      {
        "type": "PASSPORT",
        "status": "UPLOADED", // or "PENDING", "MISSING"
        "documentId": "doc-123" // if uploaded
      },
      {
        "type": "DIPLOMA",
        "status": "MISSING"
      }
    ],
    "optional": ["BANK_STATEMENT", "PHOTO"]
  }
}
```

### 3. Add onboarding checklist

```typescript
interface OnboardingChecklist {
  emailVerified: boolean;
  profileCompleted: boolean;
  firstCaseCreated: boolean;
  firstDocumentUploaded: boolean;
  firstMessageSent: boolean;
}

// Show progress indicator on dashboard
// Gamification: "4/5 steps completed!"
```

### 4. Add Smart Notifications

```typescript
// After 24 hours of registration with no case:
sendNotification('Ready to start?', 'Create your first case to begin your immigration journey');

// After case created but no documents uploaded for 48 hours:
sendNotification('Documents needed', 'Upload your documents to move your case forward');

// After 7 days of no activity:
sendNotification('Need help?', 'Our support team is here if you have questions');
```

---

## Summary of Required Changes

### Mobile App (Immediate)

1. ✅ Create verification guard hook
2. ✅ Create case requirement guard hook
3. ✅ Create profile completion guard hook
4. ✅ Update Upload Document screen with guards
5. ✅ Update Dashboard with conditional rendering
6. ✅ Add informative empty states
7. ✅ Add helper text for disabled actions
8. ✅ Implement delete account validation

### Backend (Required for full functionality)

1. ❌ Add `accountState` field to User model
2. ❌ Add case validation on document upload endpoint
3. ❌ Add `GET /api/cases/{id}/required-documents` endpoint
4. ❌ Add duplicate service type validation on case creation
5. ❌ Add account deletion validation
6. ❌ Add automatic agent assignment logic

### Future Enhancements

1. 💡 Onboarding checklist with progress
2. 💡 Smart reminder notifications
3. 💡 In-app guided tours
4. 💡 Case status timeline with expected dates
5. 💡 Document upload progress tracking
6. 💡 Auto-save draft cases

---

This structure ensures users follow the proper workflow and prevents system abuse! 🎯

