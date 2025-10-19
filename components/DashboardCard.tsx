import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { Card } from './ui/Card';
import { COLORS, SPACING } from '../lib/constants';

interface DashboardCardProps {
    title: string;
    value: string | number;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    color?: string;
    onPress?: () => void;
}

export default function DashboardCard({
    title,
    value,
    icon,
    color = COLORS.primary,
    onPress,
}: DashboardCardProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const CardContent = (
        <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <MaterialCommunityIcons name={icon} size={32} color={color} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.value}>{value}</Text>
                <Text style={styles.title}>{title}</Text>
            </View>
        </View>
    );

    if (onPress) {
        return (
            <Animated.View style={[styles.card, animatedStyle]}>
                <Pressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    <Card style={styles.cardInner}>{CardContent}</Card>
                </Pressable>
            </Animated.View>
        );
    }

    return (
        <View style={styles.cardWrapper}>
            <Card>{CardContent}</Card>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        margin: SPACING.xs,
    },
    cardWrapper: {
        flex: 1,
        margin: SPACING.xs,
    },
    cardInner: {
        padding: 0,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    textContainer: {
        flex: 1,
    },
    value: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    title: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
});

