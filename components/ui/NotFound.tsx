import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { COLORS, SPACING } from '../../lib/constants';
import { ModernHeader } from './ModernHeader';
import { TouchDetector } from './TouchDetector';

interface NotFoundProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title?: string;
  description?: string;
  showGoHome?: boolean;
  showGoBack?: boolean;
  variant?: 'email' | 'message' | 'document' | 'generic';
}

export const NotFound: React.FC<NotFoundProps> = ({
  icon,
  title,
  description,
  showGoHome = true,
  showGoBack = true,
  variant = 'generic',
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  // Determine icon and texts based on variant
  const getVariantConfig = () => {
    switch (variant) {
      case 'email':
        return {
          icon: icon || 'email-off-outline',
          defaultTitle: title || t('errors.emailNotFound') || 'Email Not Found',
          defaultDescription:
            description ||
            t('errors.emailNotFoundDesc') ||
            "The email message you're looking for doesn't exist or may have been deleted.",
        };
      case 'message':
        return {
          icon: icon || 'message-text-off-outline',
          defaultTitle: title || t('errors.messageNotFound') || 'Message Not Found',
          defaultDescription:
            description ||
            t('errors.messageNotFoundDesc') ||
            "The chat message you're looking for doesn't exist or may have been deleted.",
        };
      case 'document':
        return {
          icon: icon || 'file-document-remove-outline',
          defaultTitle: title || t('errors.documentNotFound') || 'Document Not Found',
          defaultDescription:
            description ||
            t('errors.documentNotFoundDesc') ||
            "The document you're looking for doesn't exist or may have been deleted.",
        };
      default:
        return {
          icon: icon || 'alert-circle-outline',
          defaultTitle: title || t('errors.notFound') || 'Content Not Found',
          defaultDescription:
            description ||
            t('errors.notFoundDesc') ||
            "The content you're looking for doesn't exist or may have been deleted.",
        };
    }
  };

  const config = getVariantConfig();

  return (
    <TouchDetector>
      <View style={styles.container}>
        <ModernHeader
          variant="gradient"
          gradientColors={[COLORS.primary, '#7A9BB8', '#94B5A0']}
          title={config.defaultTitle}
          showBackButton
        />

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.iconContainer}>
            <LinearGradient
              colors={[COLORS.primary + '20', COLORS.primary + '10']}
              style={styles.iconGradient}
            >
              <MaterialCommunityIcons
                name={config.icon}
                size={80}
                color={COLORS.primary}
              />
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.textContainer}>
            <Text style={styles.title}>{config.defaultTitle}</Text>
            <Text style={styles.description}>{config.defaultDescription}</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.actionsContainer}>
            {showGoBack && (
              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <View style={styles.backButtonContent}>
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={20}
                    color={COLORS.primary}
                    style={styles.buttonIcon}
                  />
                  <Text style={[styles.buttonText, styles.backButtonText]}>
                    {t('common.goBack') || 'Go Back'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {showGoHome && (
              <TouchableOpacity
                style={[styles.button, styles.homeButton]}
                onPress={() => router.push('/(tabs)')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.primary, '#7A9BB8']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons
                    name="home"
                    size={20}
                    color="#FFFFFF"
                    style={styles.buttonIcon}
                  />
                  <Text style={[styles.buttonText, styles.homeButtonText]}>
                    {t('common.goHome') || 'Go to Home'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Decorative elements */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.decorativeCircle1}
          />
          <Animated.View
            entering={FadeInDown.delay(150).springify()}
            style={styles.decorativeCircle2}
          />
        </View>
      </View>
    </TouchDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    position: 'relative',
  },
  iconContainer: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  iconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    maxWidth: 320,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 320,
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButton: {
    // Gradient handled by LinearGradient component
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  buttonIcon: {
    marginRight: SPACING.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: COLORS.primary,
  },
  homeButtonText: {
    color: '#FFFFFF',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primary + '05',
    top: -50,
    left: -50,
    zIndex: 0,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.primary + '08',
    bottom: -30,
    right: -30,
    zIndex: 0,
  },
});

