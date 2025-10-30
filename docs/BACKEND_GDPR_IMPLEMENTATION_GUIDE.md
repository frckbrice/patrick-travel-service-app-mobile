# Backend GDPR Implementation Guide

**Target:** Complete GDPR compliance for mobile app  
**Priority:** HIGH  
**Estimated Time:** 4-6 hours

---

## 📋 Overview

This guide provides **ready-to-use code** for implementing GDPR compliance in your backend API. The mobile app is already sending GDPR data - this guide makes your backend handle it.

---

## 🎯 What You Need To Do

### Step 1: Update Database Schema (30 minutes)
Add 8 new columns to your `users` table.

### Step 2: Update Registration Endpoint (1 hour)
Modify `POST /api/auth/register` to save GDPR consent data.

### Step 3: Create Data Export Endpoint (2 hours)
Create `GET /api/users/data-export` to export all user data.

### Step 4: Create Account Deletion Endpoint (2 hours)
Create `DELETE /api/users/account` to schedule account deletion.

### Step 5: Update Profile Endpoint (30 minutes)
Modify `GET /api/users/profile` to return GDPR fields.

**Total: 4-6 hours**

---

## 📊 Database Schema Updates

### SQL Migration

```sql
-- Add GDPR fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS consented_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_privacy BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_export_requests INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_data_export TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create index for scheduled deletions
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.consented_at IS 'ISO timestamp when user gave GDPR consent';
COMMENT ON COLUMN users.accepted_terms IS 'User accepted Terms & Conditions';
COMMENT ON COLUMN users.accepted_privacy IS 'User accepted Privacy Policy';
COMMENT ON COLUMN users.data_export_requests IS 'Counter: how many times user exported data';
COMMENT ON COLUMN users.deleted_at IS 'When account was marked for deletion (30-day grace period)';
```

### Prisma Schema Update

```prisma
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  password          String
  firstName         String
  lastName          String
  phone             String?
  role              Role      @default(CLIENT)
  isActive          Boolean   @default(true)
  isVerified        Boolean   @default(false)
  
  // GDPR Compliance Fields (NEW)
  consentedAt       DateTime? @db.Timestamp
  acceptedTerms     Boolean   @default(false)
  acceptedPrivacy   Boolean   @default(false)
  termsAcceptedAt   DateTime? @db.Timestamp
  privacyAcceptedAt DateTime? @db.Timestamp
  dataExportRequests Int      @default(0)
  lastDataExport    DateTime? @db.Timestamp
  deletedAt         DateTime? @db.Timestamp
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  cases             Case[]
  documents         Document[]
  messages          Message[]
  notifications     Notification[]
  
  @@index([deletedAt])
}
```

---

## 🔧 Backend Implementation (TypeScript/Node.js)

### Step 1: Update Registration Endpoint

**File:** `src/routes/auth.ts` or `src/controllers/authController.ts`

```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../database'; // Your DB connection

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  // GDPR fields from mobile
  consentedAt?: string;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
}

export const register = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      consentedAt,
      acceptedTerms = false,
      acceptedPrivacy = false,
    }: RegisterRequest = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Check if user exists
    const existingUser = await db.users.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create consent timestamps (ISO format)
    const now = new Date().toISOString();
    const consentTimestamp = consentedAt || now;

    // Create user with GDPR data
    const newUser = await db.users.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone: phone || null,
      role: 'CLIENT',
      isActive: true,
      isVerified: false,
      
      // GDPR Compliance Fields
      consentedAt: consentTimestamp,
      acceptedTerms,
      acceptedPrivacy,
      termsAcceptedAt: acceptedTerms ? consentTimestamp : null,
      privacyAcceptedAt: acceptedPrivacy ? consentTimestamp : null,
      dataExportRequests: 0,
      lastDataExport: null,
      deletedAt: null,
      
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Generate JWT tokens
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // Return response (match mobile expectations)
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phone: newUser.phone,
          role: newUser.role,
          isActive: newUser.isActive,
          isVerified: newUser.isVerified,
          consentedAt: newUser.consentedAt,
          acceptedTerms: newUser.acceptedTerms,
          acceptedPrivacy: newUser.acceptedPrivacy,
          termsAcceptedAt: newUser.termsAcceptedAt,
          privacyAcceptedAt: newUser.privacyAcceptedAt,
          dataExportRequests: newUser.dataExportRequests,
          lastDataExport: newUser.lastDataExport,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
    });
  }
};
```

---

### Step 2: Update Profile Endpoint

**File:** `src/routes/users.ts` or `src/controllers/userController.ts`

```typescript
import { Request, Response } from 'express';
import { db } from '../database';

// Add middleware to get user from JWT
const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId; // From JWT middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const user = await db.users.findOne({ 
      id: userId,
      deletedAt: null, // Don't return deleted accounts
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Return user with GDPR fields
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        lastLogin: user.lastLogin,
        
        // GDPR Fields
        consentedAt: user.consentedAt,
        acceptedTerms: user.acceptedTerms,
        acceptedPrivacy: user.acceptedPrivacy,
        termsAcceptedAt: user.termsAcceptedAt,
        privacyAcceptedAt: user.privacyAcceptedAt,
        dataExportRequests: user.dataExportRequests,
        lastDataExport: user.lastDataExport,
        
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
};
```

---

### Step 3: Create Data Export Endpoint

**File:** `src/routes/users.ts`

```typescript
import { Request, Response } from 'express';
import { db } from '../database';

const exportData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get user
    const user = await db.users.findOne({ id: userId, deletedAt: null });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get all user data
    const [cases, documents, messages, notifications] = await Promise.all([
      db.cases.findMany({ where: { clientId: userId } }),
      db.documents.findMany({ where: { uploadedById: userId } }),
      db.messages.findMany({ 
        where: { 
          OR: [
            { senderId: userId },
            { recipientId: userId }
          ]
        }
      }),
      db.notifications.findMany({ where: { userId } }),
    ]);

    // Increment export counter
    await db.users.update({
      where: { id: userId },
      data: {
        dataExportRequests: { increment: 1 },
        lastDataExport: new Date(),
      },
    });

    // Format response
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        consentedAt: user.consentedAt,
        acceptedTerms: user.acceptedTerms,
        acceptedPrivacy: user.acceptedPrivacy,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      cases: cases.map(c => ({
        id: c.id,
        referenceNumber: c.referenceNumber,
        clientId: c.clientId,
        serviceType: c.serviceType,
        status: c.status,
        priority: c.priority,
        submissionDate: c.submissionDate,
        lastUpdated: c.lastUpdated,
      })),
      documents: documents.map(d => ({
        id: d.id,
        caseId: d.caseId,
        uploadedById: d.uploadedById,
        fileName: d.fileName,
        originalName: d.originalName,
        filePath: d.filePath,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        documentType: d.documentType,
        status: d.status,
        uploadDate: d.uploadDate,
      })),
      messages: messages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        caseId: m.caseId,
        subject: m.subject,
        content: m.content,
        isRead: m.isRead,
        readAt: m.readAt,
        sentAt: m.sentAt,
      })),
      notifications: notifications.map(n => ({
        id: n.id,
        userId: n.userId,
        caseId: n.caseId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      consent: {
        consentedAt: user.consentedAt,
        acceptedTerms: user.acceptedTerms,
        acceptedPrivacy: user.acceptedPrivacy,
        termsAcceptedAt: user.termsAcceptedAt,
        privacyAcceptedAt: user.privacyAcceptedAt,
      },
      exportedAt: new Date().toISOString(),
      format: 'json',
    };

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data',
    });
  }
};
```

---

### Step 4: Create Account Deletion Endpoint

**File:** `src/routes/users.ts`

```typescript
import { Request, Response } from 'express';
import { db } from '../database';

interface DeleteAccountRequest {
  reason?: string;
}

const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { reason }: DeleteAccountRequest = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const user = await db.users.findOne({ id: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Schedule deletion (30-day grace period)
    await db.users.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        email: `deleted-${Date.now()}@deleted.user`, // Anonymize email
        phone: null, // Remove phone
      },
    });

    // Optionally: Log reason for deletion
    await db.activityLogs.create({
      data: {
        userId,
        action: 'ACCOUNT_DELETION_REQUESTED',
        description: `Account deletion requested${reason ? ': ' + reason : ''}`,
        metadata: { reason },
      },
    });

    res.json({
      success: true,
      data: {
        message: 'Account deletion scheduled. Your data will be permanently deleted within 30 days.',
      },
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
    });
  }
};
```

---

### Step 5: Create Scheduled Deletion Job

**File:** `src/jobs/deleteAccounts.ts`

```typescript
import { db } from '../database';
import { logger } from '../utils/logger';

/**
 * Scheduled job to permanently delete accounts marked for deletion 30+ days ago
 * Run this daily via cron
 */
export const deleteScheduledAccounts = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find accounts marked for deletion 30+ days ago
    const accountsToDelete = await db.users.findMany({
      where: {
        deletedAt: {
          lte: thirtyDaysAgo,
        },
      },
    });

    logger.info(`Found ${accountsToDelete.length} accounts to delete`);

    for (const user of accountsToDelete) {
      // Delete all related data
      await Promise.all([
        db.documents.deleteMany({ where: { uploadedById: user.id } }),
        db.messages.deleteMany({ 
          where: { 
            OR: [
              { senderId: user.id },
              { recipientId: user.id }
            ]
          }
        }),
        db.notifications.deleteMany({ where: { userId: user.id } }),
      ]);

      // Delete user
      await db.users.delete({ where: { id: user.id } });

      logger.info(`Permanently deleted account: ${user.id}`);
    }

    logger.info(`Successfully deleted ${accountsToDelete.length} accounts`);
  } catch (error) {
    logger.error('Error deleting scheduled accounts:', error);
  }
};
```

**Cron Job Setup** (example with node-cron):

```typescript
import cron from 'node-cron';
import { deleteScheduledAccounts } from './jobs/deleteAccounts';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled account deletion...');
  await deleteScheduledAccounts();
});
```

---

## 🔗 API Routes Setup

**File:** `src/routes/users.ts`

```typescript
import express from 'express';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/users/profile
router.get('/profile', getProfile);

// GET /api/users/data-export
router.get('/data-export', exportData);

// DELETE /api/users/account
router.delete('/account', deleteAccount);

export default router;
```

---

## ✅ Testing

### Test Registration with GDPR Data

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "consentedAt": "2025-10-19T10:30:00.000Z",
    "acceptedTerms": true,
    "acceptedPrivacy": true
  }'
```

### Test Data Export

```bash
curl -X GET http://localhost:3000/api/users/data-export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Account Deletion

```bash
curl -X DELETE http://localhost:3000/api/users/account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "No longer need service"}'
```

---

## 📝 Implementation Checklist

- [ ] Update database schema (SQL migration)
- [ ] Update registration endpoint to save GDPR fields
- [ ] Update profile endpoint to return GDPR fields
- [ ] Create data export endpoint
- [ ] Create account deletion endpoint
- [ ] Create scheduled deletion job
- [ ] Test all endpoints
- [ ] Deploy to staging
- [ ] Test with mobile app
- [ ] Deploy to production

---

## 🎯 Summary

**What you've implemented:**

1. ✅ Database schema with 8 new GDPR columns
2. ✅ Registration endpoint saves consent data
3. ✅ Profile endpoint returns GDPR fields
4. ✅ Data export endpoint exports all user data
5. ✅ Account deletion endpoint schedules 30-day deletion
6. ✅ Scheduled job permanently deletes accounts after 30 days

**Mobile app will now:**
- ✅ Send GDPR consent data during registration
- ✅ See GDPR fields in profile
- ✅ Export all user data (Right to Portability)
- ✅ Delete account with 30-day grace period (Right to Erasure)

---

**Estimated Time:** 4-6 hours  
**Status:** ✅ Ready to implement  
**Priority:** HIGH
