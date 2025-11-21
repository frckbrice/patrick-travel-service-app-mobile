/**
 * Get Started Screen
 * Modern full-screen welcome screen with hero image
 * First screen users see before onboarding
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    Platform,
    ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../lib/theme/ThemeContext';
import { SPACING, FONT_SIZES } from '../lib/constants';
import '../lib/i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GetStartedScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();

    const handleGetStarted = () => {
        router.push('/onboarding');
    };

    const handleSignIn = () => {
        router.push('/(auth)/login');
    };

    // Determine status bar style - use light content for better visibility on image
    const statusBarStyle = 'light';

    return (
        <View style={styles.container}>
            <ExpoStatusBar style={statusBarStyle} />
            {Platform.OS === 'android' && (
                <StatusBar
                    barStyle="light-content"
                    backgroundColor="transparent"
                    translucent
                />
            )}

            {/* Full Screen Hero Image */}
            <ImageBackground
                source={require('../assets/images/mpe_hero_2.jpeg')}
                style={styles.heroImage}
                resizeMode="cover"
            >
                {/* Gradient Overlay for better text readability */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                    style={styles.gradientOverlay}
                />

                {/* Content Overlay */}
                <View style={[styles.contentOverlay, { paddingTop: insets.top }]}>
                    {/* Welcome Text Section - Centered */}
                    <View style={styles.textSection}>
                        <Text style={styles.welcomeText}>
                            {t('getStarted.welcome') || 'Welcome to MPE Digital'}
                        </Text>
                        <Text style={styles.title}>
                            {t('getStarted.title') || 'Your Journey Starts Here'}
                        </Text>
                        <Text style={styles.description}>
                            {t('getStarted.description') ||
                                'Experience seamless immigration and legal services with our comprehensive platform. Connect with expert advisors, track your cases, and manage all your documents in one place.'}
                        </Text>
                    </View>

                    {/* Action Buttons Section - Centered */}
                    <View style={[styles.actionsSection, { paddingBottom: insets.bottom + SPACING.xl }]}>
                        {/* Get Started Button */}
                        <TouchableOpacity
                            style={styles.getStartedButton}
                            onPress={handleGetStarted}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.buttonGradient}
                            >
                                <Text style={styles.getStartedButtonText}>
                                    {t('getStarted.button') || 'Get Started'}
                                </Text>
                                <MaterialCommunityIcons
                                    name="arrow-right"
                                    size={24}
                                    color="#FFFFFF"
                                    style={styles.buttonIcon}
                                />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Sign In Button */}
                        <TouchableOpacity
                            style={styles.signInButton}
                            onPress={handleSignIn}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.signInText}>
                                {t('getStarted.signIn') || 'Already have an account? Sign In'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    heroImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT + 100,
        justifyContent: 'flex-end',
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    contentOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxl,
    },
    textSection: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xxl,
        maxWidth: SCREEN_WIDTH * 0.9,
    },
    welcomeText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: SPACING.md,
        letterSpacing: 1,
        opacity: 0.95,
        textAlign: 'center',
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    title: {
        fontSize: FONT_SIZES.xxxl + 8, // 40px for modern large title
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: SPACING.lg,
        lineHeight: 48,
        letterSpacing: -0.8,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    description: {
        fontSize: FONT_SIZES.md + 1, // 17px
        color: '#FFFFFF',
        lineHeight: 26,
        opacity: 0.95,
        marginTop: SPACING.sm,
        textAlign: 'center',
        paddingHorizontal: SPACING.md,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        letterSpacing: 0.2,
    },
    actionsSection: {
        width: '100%',
        alignItems: 'center',
        maxWidth: SCREEN_WIDTH * 0.9,
    },
    getStartedButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: SPACING.md,
        width: '100%',
        maxWidth: 320,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
    },
    getStartedButtonText: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: '#FFFFFF',
        marginRight: SPACING.sm,
        letterSpacing: 0.8,
        textAlign: 'center',
    },
    buttonIcon: {
        marginLeft: 4,
    },
    signInButton: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
        marginTop: SPACING.xs,
    },
    signInText: {
        fontSize: FONT_SIZES.md,
        color: '#FFFFFF',
        fontWeight: '500',
        opacity: 0.95,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        letterSpacing: 0.3,
    },
});
