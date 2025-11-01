/**
 * Custom Card Component
 * Beautiful card with shadow and customizable styling
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useThemeColors } from '../../lib/theme/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevated = true,
  bordered = false,
}) => {
  const colors = useThemeColors();
  
  const cardStyle: ViewStyle = {
    ...styles.card,
    backgroundColor: colors.card,
    ...(elevated && styles.elevated),
    ...(bordered && { borderWidth: 1, borderColor: colors.border }),
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});

// Card Title Component
interface CardTitleProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, style }) => {
  return <View style={[cardSubStyles.cardTitle, style]}>{children}</View>;
};

// Card Content Component
interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  style,
}) => {
  return <View style={[cardSubStyles.cardContent, style]}>{children}</View>;
};

// Card Footer Component
interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => {
  const colors = useThemeColors();
  return (
    <View style={[cardSubStyles.cardFooter, { borderTopColor: colors.border }, style]}>
      {children}
    </View>
  );
};

const cardSubStyles = StyleSheet.create({
  cardTitle: {
    marginBottom: 12,
  },
  cardContent: {
    marginBottom: 12,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});

Object.assign(styles, cardSubStyles);
