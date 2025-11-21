// Constants - Professional Color Palette
export const COLORS = {
  // Primary Palette
  primary: '#2563EB', // Vibrant blue
  secondary: '#22C55E', // Vibrant green
  accent: '#F97316', // Vibrant orange

  // Status Colors (Modern, User-Friendly)
  error: '#EF4444', // Vibrant red
  success: '#22C55E', // Vibrant green
  warning: '#F59E0B', // Vibrant amber
  info: '#3B82F6', // Vibrant blue

  // Neutral Palette
  background: '#F5F6F7', // Soft off-white
  surface: '#FFFFFF',
  card: '#FAFBFC', // Subtle card background

  // Text Colors
  text: '#2C3E50', // Dark blue-grey
  textSecondary: '#7D8A96',
  textTertiary: '#A8B2BD',

  // UI Elements
  border: '#E1E4E8',
  divider: '#EDF0F2',
  disabled: '#C4CDD5',
  overlay: 'rgba(44, 62, 80, 0.6)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const SERVICE_TYPE_LABELS = {
  STUDENT_VISA: 'Student Visa',
  WORK_PERMIT: 'Work Permit',
  FAMILY_REUNIFICATION: 'Family Reunification',
  TOURIST_VISA: 'Tourist Visa',
  BUSINESS_VISA: 'Business Visa',
  PERMANENT_RESIDENCY: 'Permanent Residency',
};

export const CASE_STATUS_LABELS = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  DOCUMENTS_REQUIRED: 'Documents Required',
  PROCESSING: 'Processing',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
};

export const CASE_STATUS_COLORS = {
  SUBMITTED: '#3B82F6',
  UNDER_REVIEW: '#F59E0B',
  DOCUMENTS_REQUIRED: '#EF4444',
  PROCESSING: '#8B5CF6',
  APPROVED: '#10B981',
  REJECTED: '#DC2626',
  CLOSED: '#6B7280',
};

export const DOCUMENT_TYPE_LABELS = {
  PASSPORT: 'Passport',
  ID_CARD: 'ID Card',
  BIRTH_CERTIFICATE: 'Birth Certificate',
  MARRIAGE_CERTIFICATE: 'Marriage Certificate',
  DIPLOMA: 'Diploma',
  EMPLOYMENT_LETTER: 'Employment Letter',
  BANK_STATEMENT: 'Bank Statement',
  PROOF_OF_RESIDENCE: 'Proof of Residence',
  PHOTO: 'Photo',
  OTHER: 'Other',
};

export const DOCUMENT_STATUS_LABELS = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const DOCUMENT_STATUS_COLORS = {
  PENDING: '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#DC2626',
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['image/*', 'application/pdf'];

// AsyncStorage Keys
export const STORAGE_KEYS = {
  GET_STARTED_COMPLETED: 'get_started_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  LANGUAGE_PREFERENCE: 'language_preference',
  THEME_PREFERENCE: 'theme_preference',
} as const;

export const ROUTES = {
  AUTH: {
    LOGIN: '/(auth)/login',
    REGISTER: '/(auth)/register',
    FORGOT_PASSWORD: '/(auth)/forgot-password',
    VERIFY_EMAIL: '/(auth)/verify-email',
  },
  TABS: {
    HOME: '/(tabs)',
    CASES: '/(tabs)/cases',
    DOCUMENTS: '/(tabs)/documents',
    NOTIFICATIONS: '/(tabs)/notifications',
    PROFILE: '/(tabs)/profile',
  },
  CASE: {
    DETAILS: '/case/[id]',
    NEW: '/case/new',
  },
  DOCUMENT: {
    UPLOAD: '/document/upload',
    VIEW: '/document/[id]',
  },
  MESSAGE: {
    CHAT: '/message/[id]',
  },
  HELP: {
    FAQ: '/help/faq',
    CONTACT: '/help/contact',
  },
  ONBOARDING: '/onboarding',
};

// Export business information
export * from './business';
