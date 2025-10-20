// ============================================================================
// ENUMERATIONS (Web API Contract - Must match web exactly)
// ============================================================================

export enum Role {
  CLIENT = 'CLIENT',
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}

export enum ServiceType {
  STUDENT_VISA = 'STUDENT_VISA',
  WORK_PERMIT = 'WORK_PERMIT',
  FAMILY_REUNIFICATION = 'FAMILY_REUNIFICATION',
  TOURIST_VISA = 'TOURIST_VISA',
  BUSINESS_VISA = 'BUSINESS_VISA',
  PERMANENT_RESIDENCY = 'PERMANENT_RESIDENCY',
}

export enum CaseStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DOCUMENTS_REQUIRED = 'DOCUMENTS_REQUIRED',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum DocumentType {
  PASSPORT = 'PASSPORT',
  ID_CARD = 'ID_CARD',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  MARRIAGE_CERTIFICATE = 'MARRIAGE_CERTIFICATE',
  DIPLOMA = 'DIPLOMA',
  EMPLOYMENT_LETTER = 'EMPLOYMENT_LETTER',
  BANK_STATEMENT = 'BANK_STATEMENT',
  PROOF_OF_RESIDENCE = 'PROOF_OF_RESIDENCE',
  PHOTO = 'PHOTO',
  OTHER = 'OTHER',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum NotificationType {
  CASE_STATUS_UPDATE = 'CASE_STATUS_UPDATE',
  NEW_MESSAGE = 'NEW_MESSAGE',
  NEW_EMAIL = 'NEW_EMAIL',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  CASE_ASSIGNED = 'CASE_ASSIGNED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

export enum MessageType {
  CHAT = 'CHAT',
  EMAIL = 'EMAIL',
}

export enum TransferReason {
  REASSIGNMENT = 'REASSIGNMENT',
  COVERAGE = 'COVERAGE',
  SPECIALIZATION = 'SPECIALIZATION',
  WORKLOAD = 'WORKLOAD',
  OTHER = 'OTHER',
}

// ============================================================================
// CORE DATA MODELS (Web API Contract - Base fields match web exactly)
// ============================================================================

export interface User {
  // Base fields from web API contract
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

  // ⚠️ MOBILE-SPECIFIC GDPR FIELDS (Not in web API yet - needs backend implementation)
  // These fields are sent by mobile app but backend needs to add them to the User model
  consentedAt?: string | null;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
  termsAcceptedAt?: string | null;
  privacyAcceptedAt?: string | null;
  dataExportRequests?: number;
  lastDataExport?: Date | null;
}

export interface Case {
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

  // Optional relations (when included by API)
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

  // ⚠️ MOBILE-SPECIFIC FIELD (Not in web API contract)
  formData?: any;
}

export interface StatusHistory {
  id: string;
  caseId: string;
  status: CaseStatus;
  changedBy: string;
  notes?: string | null;
  timestamp: Date;
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
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  rejectionReason?: string | null;

  // Optional relations (when included by API)
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

export interface MessageAttachment {
  id?: string;
  url: string;
  name: string;
  size: number; // bytes
  type: string; // MIME type
  uploadedAt?: string; // ISO timestamp
  metadata?: Record<string, unknown>;
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
  attachments?: MessageAttachment[];
  messageType?: MessageType;
  emailThreadId?: string | null;
  replyToId?: string | null;
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
  actionUrl?: string | null;

  // Optional relations (when included by API)
  case?: {
    id: string;
    referenceNumber: string;
    serviceType: ServiceType;
  };
}

export interface TransferHistory {
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

  // Optional relations (when included by API)
  fromAgent?: User | null;
  toAgent?: User | null;
  transferredByUser?: User | null;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: ActivityLogMetadata;
  timestamp: Date;
}

export interface ActivityLogMetadata {
  caseId?: string;
  documentId?: string;
  messageId?: string;
  previousValue?: string;
  newValue?: string;
  additionalInfo?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES (Web API Contract)
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
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

export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  pendingDocuments: number;
  unreadMessages: number;
}

// ============================================================================
// MOBILE-SPECIFIC GDPR TYPES (Not in web API - Backend implementation needed)
// ============================================================================
// These types are used by the mobile app for GDPR compliance features.
// The backend API needs to implement these to support mobile GDPR features.
// See docs/BACKEND_GDPR_REQUIREMENTS.md for implementation details.

export enum ConsentType {
  TERMS_AND_CONDITIONS = 'TERMS_AND_CONDITIONS',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  MARKETING = 'MARKETING',
  DATA_PROCESSING = 'DATA_PROCESSING',
}

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

export interface ConsentHistory {
  userId: string;
  history: ConsentRecord[];
}

export interface UpdateConsentRequest {
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
  consentedAt: string; // ISO timestamp
}

export interface DataExportRequest {
  id: string;
  userId: string;
  requestedAt: Date;
  completedAt?: Date | null;
  downloadUrl?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  format: 'JSON' | 'CSV' | 'PDF';
}

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
  consentHistory?: ConsentRecord[];
  exportedAt: string;
  format: string;
}

export interface AccountDeletionRequest {
  userId: string;
  reason?: string;
  scheduledDeletionDate: Date;
  immediateDataAnonymization: boolean;
}

// ⚠️ Note: Web API uses slightly different structure for push tokens
// Mobile sends: { pushToken, platform, deviceId, deviceModel, osVersion }
// Web API expects: { token, platform, deviceId } via POST /api/users/push-token
export interface PushTokenRequest {
  pushToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  deviceModel?: string;
  osVersion?: string;
}
