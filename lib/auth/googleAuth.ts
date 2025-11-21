/**
 * Google OAuth 2.0 Authentication Utility
 * Handles Google Sign-In using Expo AuthSession for web/mobile
 */

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase/config';
import { logger } from '../utils/logger';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// This is required for Expo AuthSession to work properly
WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthConfig {
  webClientId: string;
  iosClientId: string;
  androidClientId: string;
}

interface GoogleAuthResult {
  success: boolean;
  user?: any;
  error?: string;
  idToken?: string;
  accessToken?: string;
}

/**
 * Get Google OAuth configuration from app config
 */
const getGoogleAuthConfig = (): GoogleAuthConfig => {
  const extra = Constants.expoConfig?.extra;

  return {
    webClientId: extra?.googleWebClientId || '',
    iosClientId: extra?.googleIosClientId || '',
    androidClientId: extra?.googleAndroidClientId || '',
  };
};

/**
 * Get client ID based on platform
 * CRITICAL: On mobile (iOS/Android), we MUST use platform-specific client IDs
 * Web client IDs cannot be used with custom redirect schemes on mobile
 */
const getClientId = (): string => {
  const config = getGoogleAuthConfig();

  switch (Platform.OS) {
    case 'ios':
      if (!config.iosClientId) {
        logger.error('iOS client ID is missing - Google OAuth will fail');
        throw new Error('iOS Google OAuth client ID is not configured');
      }
      return config.iosClientId;
    case 'android':
      if (!config.androidClientId) {
        logger.error('Android client ID is missing - Google OAuth will fail');
        throw new Error('Android Google OAuth client ID is not configured');
      }
      return config.androidClientId;
    default:
      // Web platform - use web client ID
      return config.webClientId;
  }
};

/**
 * Initialize Google Auth using Expo AuthSession
 * CRITICAL: On mobile, we must use platform-specific client IDs (iOS/Android)
 * Web client IDs cannot be used with custom redirect schemes (patrick-travel://)
 * 
 * According to Expo docs: https://docs.expo.dev/guides/authentication/
 * For development builds with custom schemes, use makeRedirectUri() to generate the correct URI
 */
export const useGoogleAuth = () => {
  const config = getGoogleAuthConfig();

  // Validate configuration before initializing
  if (Platform.OS === 'ios' && !config.iosClientId) {
    logger.error('iOS Google OAuth client ID is missing');
  }
  if (Platform.OS === 'android' && !config.androidClientId) {
    logger.error('Android Google OAuth client ID is missing');
  }
  if (Platform.OS === 'web' && !config.webClientId) {
    logger.error('Web Google OAuth client ID is missing');
  }

  // Generate redirect URI using Expo's makeRedirectUri
  // This ensures the correct format for custom schemes
  // For custom scheme 'patrick-travel', this will generate: patrick-travel://redirect
  // NOTE: scheme should NOT include '://' - makeRedirectUri adds it automatically
  const redirectUriResult: string | string[] = AuthSession.makeRedirectUri({
    scheme: (Constants.expoConfig?.scheme || 'patrick-travel') as string,
    path: 'redirect', // Optional: adds /redirect path
  });

  // makeRedirectUri returns string | string[], convert to string
  const redirectUri: string = Array.isArray(redirectUriResult) ? redirectUriResult[0] : redirectUriResult;

  logger.info('Google OAuth redirect URI', { redirectUri, platform: Platform.OS });

  const [request, response, promptAsync] = Google.useAuthRequest({
    // For mobile: use platform-specific client ID (NOT webClientId)
    // For web: use webClientId
    clientId: getClientId(),
    // Provide all client IDs - expo-auth-session will use the correct one
    iosClientId: config.iosClientId,
    androidClientId: config.androidClientId,
    webClientId: config.webClientId,
    scopes: ['profile', 'email'],
    // Explicitly set redirectUri to ensure correct format
    // makeRedirectUri returns string | string[], but useAuthRequest expects string
    redirectUri: typeof redirectUri === 'string' ? redirectUri : redirectUri[0],
  });

  return { request, response, promptAsync };
};

/**
 * Sign in with Google using Firebase
 */
export const signInWithGoogle = async (
  idToken: string,
  accessToken?: string
): Promise<GoogleAuthResult> => {
  try {
    logger.info('Starting Google Sign-In with Firebase');

    // Create Firebase credential from Google tokens
    const credential = GoogleAuthProvider.credential(idToken, accessToken);

    // Sign in to Firebase with the credential
    const result = await signInWithCredential(auth, credential);

    logger.info('Google Sign-In successful', {
      userId: result.user.uid,
      email: result.user.email,
    });

    return {
      success: true,
      user: result.user,
      idToken,
      accessToken,
    };
  } catch (error: any) {
    logger.error('Google Sign-In failed', error);
    return {
      success: false,
      error: error.message || 'Google Sign-In failed',
    };
  }
};

/**
 * Handle Google Auth response from Expo AuthSession
 */
export const handleGoogleAuthResponse = async (
  response: any
): Promise<GoogleAuthResult> => {
  if (response?.type === 'success') {
    const { authentication } = response;

    if (authentication?.idToken) {
      return await signInWithGoogle(
        authentication.idToken,
        authentication.accessToken
      );
    } else {
      logger.error('Google authentication response missing idToken');
      return {
        success: false,
        error: 'Authentication response invalid',
      };
    }
  } else if (response?.type === 'cancel') {
    logger.info('Google Sign-In cancelled by user');
    return {
      success: false,
      error: 'Sign-in cancelled',
    };
  } else {
    logger.error('Google Sign-In error', response?.error);
    return {
      success: false,
      error: response?.error?.message || 'Authentication failed',
    };
  }
};

/**
 * Get user info from Google ID token
 */
export const getUserInfoFromIdToken = (idToken: string): any => {
  try {
    // Decode JWT token (basic implementation)
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    logger.error('Failed to decode ID token', error);
    return null;
  }
};

/**
 * Validate Google OAuth configuration
 */
export const validateGoogleAuthConfig = (): {
  isValid: boolean;
  missingFields: string[];
} => {
  const config = getGoogleAuthConfig();
  const missingFields: string[] = [];

  if (!config.webClientId) missingFields.push('webClientId');
  if (!config.iosClientId && Platform.OS === 'ios')
    missingFields.push('iosClientId');
  if (!config.androidClientId && Platform.OS === 'android')
    missingFields.push('androidClientId');

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * Sign out from Google
 */
export const signOutFromGoogle = async (): Promise<void> => {
  try {
    await auth.signOut();
    logger.info('Signed out from Google successfully');
  } catch (error) {
    logger.error('Error signing out from Google', error);
    throw error;
  }
};
