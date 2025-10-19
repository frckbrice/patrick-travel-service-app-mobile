/**
 * Badge Component
 * Beautiful badge for status indicators and counts
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const COLORS = {
  primary: '#0066CC',
  success: '#28A745',
  warning: '#FFC107',
  danger: '#DC3545',
  info: '#17A2B8',
  secondary: '#6C757D',
  white: '#FFFFFF',
  dark: '#212529',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = false,
  style,
  textStyle,
}) => {
  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'primary':
        return COLORS.primary;
      case 'success':
        return COLORS.success;
      case 'warning':
        return COLORS.warning;
      case 'danger':
        return COLORS.danger;
      case 'info':
        return COLORS.info;
      case 'secondary':
        return COLORS.secondary;
      default:
        return COLORS.primary;
    }
  };

  const getTextColor = (): string => {
    return variant === 'warning' ? COLORS.dark : COLORS.white;
  };

  const badgeStyle: ViewStyle = {
    ...styles.badge,
    ...styles[`badge_${size}`],
    backgroundColor: getBackgroundColor(),
    ...(rounded && styles.badgeRounded),
    ...style,
  };

  const badgeTextStyle: TextStyle = {
    ...styles.text,
    ...styles[`text_${size}`],
    color: getTextColor(),
    ...textStyle,
  };

  return (
    <View style={badgeStyle}>
      <Text style={badgeTextStyle}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badge_sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badge_md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badge_lg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeRounded: {
    borderRadius: 999,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_sm: {
    fontSize: 10,
  },
  text_md: {
    fontSize: 12,
  },
  text_lg: {
    fontSize: 14,
  },
});

