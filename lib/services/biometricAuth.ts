import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { secureStorage } from '../storage/secureStorage';
import { logger } from '../utils/logger';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

interface BiometricResult {
  success: boolean;
  error?: string;
  biometryType?: string;
}

class BiometricAuthService {
  /**
   * Check if device supports biometric authentication
   */
  async isAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      return compatible && enrolled;
    } catch (error) {
      logger.error('Biometric availability check failed', error);
      return false;
    }
  }

  /**
   * Get available biometric types (Face ID, Touch ID, Fingerprint, etc.)
   */
  async getSupportedTypes(): Promise<string[]> {
    try {
      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      return types.map((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'Iris Recognition';
          default:
            return 'Biometric';
        }
      });
    } catch (error) {
      logger.error('Failed to get biometric types', error);
      return [];
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticate(reason?: string): Promise<BiometricResult> {
    try {
      const available = await this.isAvailable();

      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication not available',
        };
      }

      const types = await this.getSupportedTypes();
      const biometryType = types[0] || 'Biometric';

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || `Authenticate with ${biometryType}`,
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        logger.info('Biometric authentication successful');
        return {
          success: true,
          biometryType,
        };
      } else {
        logger.warn('Biometric authentication failed', { error: result.error });
        return {
          success: false,
          error: result.error || 'Authentication failed',
        };
      }
    } catch (error: any) {
      logger.error('Biometric authentication error', error);
      return {
        success: false,
        error: error.message || 'Authentication error',
      };
    }
  }

  /**
   * Check if biometric auth is enabled for the user
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      return await secureStorage.getBiometricEnabled();
    } catch (error) {
      logger.error('Failed to check biometric status', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(): Promise<boolean> {
    try {
      const available = await this.isAvailable();

      if (!available) {
        return false;
      }

      // Test authentication before enabling
      const result = await this.authenticate('Enable biometric authentication');

      if (result.success) {
        await secureStorage.setBiometricEnabled(true);
        logger.info('Biometric authentication enabled');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to enable biometric', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    try {
      await secureStorage.setBiometricEnabled(false);
      logger.info('Biometric authentication disabled');
    } catch (error) {
      logger.error('Failed to disable biometric', error);
    }
  }

  /**
   * Authenticate and login with biometrics
   * Returns stored credentials if authentication succeeds
   */
  async authenticateForLogin(): Promise<{
    email: string;
    password: string;
  } | null> {
    try {
      const enabled = await this.isBiometricEnabled();

      if (!enabled) {
        return null;
      }

      const result = await this.authenticate('Login with biometrics');

      if (!result.success) {
        return null;
      }

      // Get stored credentials
      const email = await secureStorage.getSecure('biometric_email');
      const password = await secureStorage.getSecure('biometric_password');

      if (email && password) {
        return { email, password };
      }

      return null;
    } catch (error) {
      logger.error('Biometric login failed', error);
      return null;
    }
  }

  /**
   * Store credentials for biometric login
   * WARNING: Only use this if absolutely necessary. Consider token-based auth instead.
   */
  async storeBiometricCredentials(
    email: string,
    password: string
  ): Promise<boolean> {
    try {
      await secureStorage.setSecure('biometric_email', email);
      await secureStorage.setSecure('biometric_password', password);
      logger.info('Biometric credentials stored');
      return true;
    } catch (error) {
      logger.error('Failed to store biometric credentials', error);
      return false;
    }
  }

  /**
   * Clear stored biometric credentials
   */
  async clearBiometricCredentials(): Promise<void> {
    try {
      await secureStorage.deleteSecure('biometric_email');
      await secureStorage.deleteSecure('biometric_password');
      await this.disableBiometric();
      logger.info('Biometric credentials cleared');
    } catch (error) {
      logger.error('Failed to clear biometric credentials', error);
    }
  }
}

export const biometricAuthService = new BiometricAuthService();
