/**
 * Custom Input Component
 * Beautiful text input with validation, icons, and error states
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  testID?: string;
}

const COLORS = {
  primary: '#0066CC',
  error: '#DC3545',
  text: '#212529',
  placeholder: '#6C757D',
  border: '#CED4DA',
  borderFocus: '#0066CC',
  borderError: '#DC3545',
  background: '#FFFFFF',
  disabled: '#E9ECEF',
};

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  error,
  helperText,
  icon,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  inputStyle,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const getBorderColor = (): string => {
    if (error) return COLORS.borderError;
    if (isFocused) return COLORS.borderFocus;
    return COLORS.border;
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: editable ? COLORS.background : COLORS.disabled,
          },
          multiline && styles.inputContainerMultiline,
        ]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={isFocused ? COLORS.primary : COLORS.placeholder}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            secureTextEntry && styles.inputWithRightIcon,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          testID={testID}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.rightIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color={COLORS.placeholder}
            />
          </TouchableOpacity>
        )}
      </View>

      {(error || helperText) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 12,
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  inputMultiline: {
    paddingTop: 0,
    textAlignVertical: 'top',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    padding: 4,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.placeholder,
    marginTop: 4,
    marginLeft: 4,
  },
  errorText: {
    color: COLORS.error,
  },
});
