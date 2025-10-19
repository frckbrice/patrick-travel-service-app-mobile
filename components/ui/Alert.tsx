/**
 * Alert Component
 * Beautiful alert for displaying important messages
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  style?: ViewStyle;
}

const COLORS = {
  info: {
    background: '#D1ECF1',
    border: '#BEE5EB',
    text: '#0C5460',
    icon: '#17A2B8',
  },
  success: {
    background: '#D4EDDA',
    border: '#C3E6CB',
    text: '#155724',
    icon: '#28A745',
  },
  warning: {
    background: '#FFF3CD',
    border: '#FFEAA7',
    text: '#856404',
    icon: '#FFC107',
  },
  error: {
    background: '#F8D7DA',
    border: '#F5C6CB',
    text: '#721C24',
    icon: '#DC3545',
  },
};

const ICONS: Record<AlertVariant, keyof typeof MaterialCommunityIcons.glyphMap> = {
  info: 'information-outline',
  success: 'check-circle-outline',
  warning: 'alert-outline',
  error: 'alert-circle-outline',
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  dismissible = false,
  onDismiss,
  style,
}) => {
  const colors = COLORS[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={ICONS[variant]}
        size={24}
        color={colors.icon}
        style={styles.icon}
      />
      <View style={styles.content}>
        {title && (
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        )}
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      </View>
      {dismissible && onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
          <MaterialCommunityIcons
            name="close"
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  icon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

