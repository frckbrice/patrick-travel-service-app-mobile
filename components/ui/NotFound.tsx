import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { SPACING } from '../../lib/constants';
import { ThemeAwareHeader } from './ThemeAwareHeader';
import { TouchDetector } from './TouchDetector';
import { useThemeColors } from '../../lib/theme/ThemeContext';

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
  const colors = useThemeColors();

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

  // Theme-aware gradient colors
  const headerGradient = colors.isDark
    ? [colors.primary, '#4A90E2', '#5AA3C7']
    : [colors.primary, '#7A9BB8', '#94B5A0'];

  const iconGradientStart = colors.primary + (colors.isDark ? '25' : '20');
  const iconGradientEnd = colors.primary + (colors.isDark ? '15' : '10');
  const primaryBorder = colors.primary + (colors.isDark ? '40' : '30');

  const buttonGradient = colors.isDark
    ? [colors.primary, '#4A90E2']
    : [colors.primary, '#7A9BB8'];

  return (
    <TouchDetector>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ThemeAwareHeader
          variant="gradient"
          gradientColors={headerGradient}
          title={config.defaultTitle}
          showBackButton
        />

        <View style={styles.content}>
          {/* Decorative background circles */}
          <Animated.View
            entering={FadeIn.delay(100).duration(600)}
            style={[
              styles.decorativeCircle1,
              {
                backgroundColor: colors.primary + (colors.isDark ? '08' : '05'),
              },
            ]}
          />
          <Animated.View
            entering={FadeIn.delay(150).duration(600)}
            style={[
              styles.decorativeCircle2,
              {
                backgroundColor: colors.primary + (colors.isDark ? '10' : '08'),
              },
            ]}
          />
          <Animated.View
            entering={FadeIn.delay(200).duration(600)}
            style={[
              styles.decorativeCircle3,
              {
                backgroundColor: colors.primary + (colors.isDark ? '06' : '04'),
              },
            ]}
          />

          {/* Icon Container */}
          <Animated.View
            entering={FadeInDown.delay(250).springify()}
            style={styles.iconContainer}
          >
            <LinearGradient
              colors={[iconGradientStart, iconGradientEnd]}
              style={[
                styles.iconGradient,
                {
                  borderColor: primaryBorder,
                  shadowColor: colors.primary,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={config.icon}
                size={80}
                color={colors.primary}
              />
            </LinearGradient>
          </Animated.View>

          {/* Text Container */}
          <Animated.View
            entering={FadeInDown.delay(350).springify()}
            style={styles.textContainer}
          >
            <Text style={[styles.title, { color: colors.text }]}>
              {config.defaultTitle}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {config.defaultDescription}
            </Text>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View
            entering={FadeInUp.delay(450).springify()}
            style={styles.actionsContainer}
          >
            {showGoBack && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.backButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: primaryBorder,
                    shadowColor: colors.isDark ? '#000' : colors.primary,
                  },
                ]}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <View style={styles.backButtonContent}>
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={20}
                    color={colors.primary}
                    style={styles.buttonIcon}
                  />
                  <Text
                    style={[styles.buttonText, { color: colors.primary }]}
                  >
                    {t('common.goBack') || 'Go Back'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {showGoHome && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.homeButton,
                  {
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={() => router.push('/(tabs)')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={buttonGradient}
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
        </View>
      </View>
    </TouchDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
    zIndex: 2,
  },
  iconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    maxWidth: 320,
    zIndex: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.md,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 320,
    gap: SPACING.md,
    marginTop: SPACING.lg,
    zIndex: 2,
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    borderWidth: 2,
    paddingVertical: SPACING.md + 2,
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
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
  },
  buttonIcon: {
    marginRight: SPACING.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  homeButtonText: {
    color: '#FFFFFF',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -80,
    left: -80,
    zIndex: 0,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -40,
    right: -40,
    zIndex: 0,
  },
  decorativeCircle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: '20%',
    right: -30,
    zIndex: 0,
  },
});

