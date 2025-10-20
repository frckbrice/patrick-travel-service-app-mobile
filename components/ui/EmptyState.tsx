/**
 * Empty State Component
 * Beautiful empty state with icon, message, and action button
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  actionText,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons
        name={icon}
        size={64}
        color="#CED4DA"
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionText && onAction && (
        <Button title={actionText} onPress={onAction} style={styles.button} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
  },
});
