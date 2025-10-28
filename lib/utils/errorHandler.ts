/**
 * Error Handler Utility
 * Sanitizes backend errors and provides user-friendly messages
 * Never exposes backend implementation details to users
 */

import { logger } from './logger';

export interface SanitizedError {
  message: string;
  code?: string;
}

/**
 * Sanitizes error messages to prevent exposing backend implementation details
 * @param error The error object from catch block
 * @returns User-friendly error message
 */
export function sanitizeErrorMessage(error: any): string {
  // Log full error for debugging (never show to user)
  logger.error('Error occurred', error);

  // Handle Firebase Auth errors
  if (error?.code) {
    const errorCode = error.code as string;
    return getFirebaseErrorMessage(errorCode);
  }

  // Handle generic Firebase errors
  if (error?.message?.includes('Firebase')) {
    return getUserFriendlyMessage('auth/invalid-credential');
  }

  // Handle network errors
  if (error?.message?.includes('Network Error') || error?.message?.includes('fetch') || error?.code === 'ECONNABORTED' || error?.code === 'ECONNREFUSED') {
    return 'Unable to connect to the server. Please make sure the server is running and your device is on the same network.';
  }

  // Handle timeout errors
  if (error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Handle API response errors with user-friendly messages
  if (error?.response?.data?.error) {
    const backendError = error.response.data.error;
    // If backend already provides a user-friendly message, use it
    if (
      !backendError.includes('Firebase') &&
      !backendError.includes('Firestore') &&
      !backendError.includes('auth/')
    ) {
      return backendError;
    }
  }

  // Default fallback - never expose error details
  return 'Something went wrong. Please try again.';
}

/**
 * Maps Firebase error codes to user-friendly messages
 * Never exposes Firebase-specific details
 */
function getFirebaseErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    // Authentication errors
    'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.',
    'auth/wrong-password': 'Invalid email or password. Please check your credentials and try again.',
    'auth/user-not-found': 'No account found with this email address.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'This action is not allowed. Please contact support.',
    'auth/requires-recent-login': 'Please login again to complete this action.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    
    // Registration errors
    'auth/email-already-exists': 'An account with this email already exists.',
    'auth/invalid-password': 'Password is invalid. Please choose a different password.',
    'auth/missing-email': 'Email address is required.',
    
    // Generic catch-all for unknown Firebase errors
    'auth/internal-error': 'An error occurred. Please try again.',
  };

  return errorMessages[code] || 'Something went wrong. Please try again.';
}

/**
 * Gets error code for logging purposes (not shown to user)
 */
export function getErrorCode(error: any): string | undefined {
  if (error?.code) {
    return error.code;
  }
  if (error?.response?.status) {
    return `HTTP_${error.response.status}`;
  }
  return undefined;
}

/**
 * Sanitizes and formats error for user display
 */
export function createUserFriendlyError(error: any): SanitizedError {
  return {
    message: sanitizeErrorMessage(error),
    code: getErrorCode(error),
  };
}

/**
 * User-friendly message mapping
 */
function getUserFriendlyMessage(code: string): string {
  return getFirebaseErrorMessage(code);
}

