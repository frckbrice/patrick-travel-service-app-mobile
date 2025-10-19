// Types
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
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  CASE_ASSIGNED = 'CASE_ASSIGNED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // GDPR Compliance
  consentedAt?: string | null;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
  termsAcceptedAt?: string | null;
  privacyAcceptedAt?: string | null;
}

export interface Case {
  id: string;
  referenceNumber: string;
  clientId: string;
  client?: User;
  assignedAgentId?: string | null;
  assignedAgent?: User | null;
  serviceType: ServiceType;
  status: CaseStatus;
  priority: Priority;
  submissionDate: Date;
  lastUpdated: Date;
  internalNotes?: string | null;
  estimatedCompletion?: Date | null;
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
  uploadedBy?: User;
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

export interface Message {
  id: string;
  senderId: string;
  sender?: User;
  recipientId: string;
  recipient?: User;
  caseId?: string | null;
  case?: Case;
  subject?: string | null;
  content: string;
  isRead: boolean;
  readAt?: Date | null;
  sentAt: Date;
  attachments?: any;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  pendingDocuments: number;
  unreadMessages: number;
}

