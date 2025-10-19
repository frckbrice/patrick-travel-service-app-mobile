import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
    const CardContent = (
        <Card.Content style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <MaterialCommunityIcons name={icon} size={32} color={color} />
            </View>
            <View style={styles.textContainer}>
                <Text variant="headlineMedium" style={styles.value}>
                    {value}
                </Text>
                <Text variant="bodyMedium" style={styles.title}>
                    {title}
                </Text>
            </View>
        </Card.Content>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} style={styles.card}>
                <Card style={styles.cardInner}>{CardContent}</Card>
            </TouchableOpacity>
        );
    }

    return (
        <Card style={styles.cardWrapper}>
            {CardContent}
        </Card>
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
        flex: 1,
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
        fontWeight: 'bold',
        color: COLORS.text,
    },
    title: {
        color: COLORS.textSecondary,
    },
});

