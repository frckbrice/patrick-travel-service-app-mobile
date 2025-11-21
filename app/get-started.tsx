/**
 * Get Started Screen
 * Beautiful welcome screen with hero image
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../lib/constants';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GetStartedScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleGetStarted = () => {
        router.push('/onboarding');
    };

    // Determine status bar style based on system settings
    const statusBarStyle = isDark ? 'light' : 'dark';

    return (
        <View style={styles.container}>
            <ExpoStatusBar style={statusBarStyle} />
            {Platform.OS === 'android' && (
                <StatusBar
                    barStyle={isDark ? 'light-content' : 'dark-content'}
                    backgroundColor="transparent"
                    translucent
                />
            )}

            {/* Hero Image */}
            <View style={styles.imageContainer}>
                <Image
                    source={require('../assets/images/pts_home_image.jpeg')}
                    style={styles.heroImage}
                    resizeMode="cover"
                />
                {/* Gradient Overlay for better text readability */}
                <View style={styles.gradientOverlay} />
            </View>

            {/* Content Section */}
            <View style={styles.contentContainer}>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        {t('getStarted.welcome') || 'Welcome to MPE Digital'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {t('getStarted.description') ||
                            'Your trusted partner for immigration and legal services. Get started on your journey today.'}
                    </Text>
                </View>

                {/* Get Started Button */}
                <TouchableOpacity
                    style={styles.getStartedButton}
                    onPress={handleGetStarted}
                    activeOpacity={0.8}
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
                </TouchableOpacity>

                {/* Skip to Login (Optional) */}
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => router.push('/(auth)/login')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.skipText}>
                        {t('getStarted.skip') || 'Already have an account? Sign In'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    imageContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.6,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.xxl,
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -32,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    textContainer: {
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.md,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        lineHeight: 24,
    },
    getStartedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        borderRadius: 16,
        marginTop: SPACING.lg,
        shadowColor: COLORS.primary,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    getStartedButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginRight: SPACING.sm,
    },
    buttonIcon: {
        marginLeft: 4,
    },
    skipButton: {
        marginTop: SPACING.lg,
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    skipText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
});

