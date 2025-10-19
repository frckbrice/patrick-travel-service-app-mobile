import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, FlatList, Image } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING } from '../lib/constants';
import { secureStorage } from '../lib/storage/secureStorage';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
    id: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    titleKey: string;
    descriptionKey: string;
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        icon: 'airplane',
        titleKey: 'onboarding.slide1Title',
        descriptionKey: 'onboarding.slide1Description',
    },
    {
        id: '2',
        icon: 'briefcase-check',
        titleKey: 'onboarding.slide2Title',
        descriptionKey: 'onboarding.slide2Description',
    },
    {
        id: '3',
        icon: 'chat',
        titleKey: 'onboarding.slide3Title',
        descriptionKey: 'onboarding.slide3Description',
    },
    {
        id: '4',
        icon: 'file-upload',
        titleKey: 'onboarding.slide4Title',
        descriptionKey: 'onboarding.slide4Description',
    },
];

export default function OnboardingScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            handleGetStarted();
        }
    };

    const handleSkip = () => {
        handleGetStarted();
    };

    const handleGetStarted = async () => {
        await secureStorage.set('hasSeenOnboarding', true);
        router.replace('/(auth)/login');
    };

    const renderSlide = ({ item }: { item: OnboardingSlide }) => (
        <View style={styles.slide}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={item.icon} size={120} color={COLORS.primary} />
            </View>
            <Text variant="headlineLarge" style={styles.title}>
                {t(item.titleKey)}
            </Text>
            <Text variant="bodyLarge" style={styles.description}>
                {t(item.descriptionKey)}
            </Text>
        </View>
    );

    const renderDots = () => (
        <View style={styles.dotsContainer}>
            {slides.map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.dot,
                        index === currentIndex && styles.activeDot,
                    ]}
                />
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.skipContainer}>
                {currentIndex < slides.length - 1 && (
                    <Button mode="text" onPress={handleSkip}>
                        {t('onboarding.skip')}
                    </Button>
                )}
            </View>

            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
            />

            {renderDots()}

            <View style={styles.buttonContainer}>
                <Button
                    mode="contained"
                    onPress={handleNext}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                >
                    {currentIndex === slides.length - 1
                        ? t('onboarding.getStarted')
                        : t('onboarding.next')}
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    skipContainer: {
        alignItems: 'flex-end',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
    },
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    iconContainer: {
        marginBottom: SPACING.xxl,
    },
    title: {
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: SPACING.md,
        color: COLORS.text,
    },
    description: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        paddingHorizontal: SPACING.lg,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: SPACING.xl,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.border,
        marginHorizontal: 4,
    },
    activeDot: {
        width: 24,
        backgroundColor: COLORS.primary,
    },
    buttonContainer: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xxl,
    },
    button: {
        paddingVertical: SPACING.sm,
    },
    buttonContent: {
        paddingVertical: SPACING.sm,
    },
});

