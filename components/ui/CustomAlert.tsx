/**
 * CustomAlert Component
 * Beautiful, modern replacement for React Native's Alert
 * Supports modal and bottom sheet styles with smooth animations
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: AlertButtonStyle;
}

export interface CustomAlertOptions {
  title?: string;
  message: string;
  buttons?: AlertButton[];
  variant?: 'modal' | 'bottomSheet';
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  showIcon?: boolean;
}

interface AlertContextType {
  showAlert: (
    title: string,
    message: string,
    buttons?: AlertButton[],
    options?: Omit<CustomAlertOptions, 'title' | 'message' | 'buttons'>
  ) => Promise<number>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<CustomAlertOptions | null>(null);
  const [resolveCallback, setResolveCallback] = useState<((value: number) => void) | null>(null);

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      buttons?: AlertButton[],
      alertOptions?: Omit<CustomAlertOptions, 'title' | 'message' | 'buttons'>
    ) => {
      return new Promise<number>((resolve) => {
        setOptions({
          title,
          message,
          buttons: buttons || [{ text: 'OK' }],
          ...alertOptions,
        });
        setResolveCallback(() => resolve);
        setVisible(true);
      });
    },
    []
  );

  const handleButtonPress = useCallback(
    (index: number, button: AlertButton) => {
      setVisible(false);
      if (resolveCallback) {
        resolveCallback(index);
        setResolveCallback(null);
      }
      if (button.onPress) {
        button.onPress();
      }
    },
    [resolveCallback]
  );

  const handleBackdropPress = useCallback(() => {
    if (options?.buttons && options.buttons.length > 0) {
      handleButtonPress(0, options.buttons[0]);
    }
  }, [options, handleButtonPress]);

  const variant = options?.variant || 'modal';

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {options && (
        <>
          {variant === 'bottomSheet' ? (
            <BottomSheetAlert
              visible={visible}
              options={options}
              onButtonPress={handleButtonPress}
              onBackdropPress={handleBackdropPress}
            />
          ) : (
            <ModalAlert
              visible={visible}
              options={options}
              onButtonPress={handleButtonPress}
              onBackdropPress={handleBackdropPress}
            />
          )}
        </>
      )}
    </AlertContext.Provider>
  );
};

export const useCustomAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within AlertProvider');
  }
  return context;
};

// Modal-style alert
const ModalAlert: React.FC<{
  visible: boolean;
  options: CustomAlertOptions;
  onButtonPress: (index: number, button: AlertButton) => void;
  onBackdropPress: () => void;
}> = ({ visible, options, onButtonPress, onBackdropPress }) => {
  const colors = useThemeColors();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const buttons = options.buttons || [{ text: 'OK' }];
  const showIcon = options.showIcon !== false;

  React.useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0.8, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const getIconName = () => {
    if (options.icon) return options.icon;
    const hasDestructive = buttons.some((b) => b.style === 'destructive');
    const hasCancel = buttons.some((b) => b.style === 'cancel');
    if (hasDestructive) return 'alert-circle';
    if (hasCancel && buttons.length === 2) return 'help-circle';
    return 'information';
  };

  const iconColor = buttons.some((b) => b.style === 'destructive')
    ? colors.error
    : colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onBackdropPress}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        ) : null}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onBackdropPress}
        />
      </Animated.View>

      <View style={styles.centeredView}>
        <Animated.View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.surface },
            animatedContainerStyle,
          ]}
        >
          {showIcon && (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: iconColor + '15' },
              ]}
            >
              <MaterialCommunityIcons
                name={getIconName()}
                size={48}
                color={iconColor}
              />
            </View>
          )}

          {options.title && (
            <Text style={[styles.title, { color: colors.text }]}>
              {options.title}
            </Text>
          )}

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {options.message}
          </Text>

          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              const isLast = index === buttons.length - 1;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    buttons.length === 1 && styles.buttonFullWidth,
                    buttons.length === 2 &&
                      index === 0 &&
                      styles.buttonHalfWidth,
                    isCancel && { borderWidth: 1.5, borderColor: colors.border },
                    isDestructive && { backgroundColor: colors.error },
                    !isDestructive && !isCancel && { backgroundColor: colors.primary },
                    !isLast && styles.buttonMarginRight,
                  ]}
                  onPress={() => onButtonPress(index, button)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      (isCancel || isDestructive) && {
                        color: isDestructive ? '#FFFFFF' : colors.primary,
                      },
                      !isCancel && !isDestructive && { color: '#FFFFFF' },
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Bottom sheet alert
const BottomSheetAlert: React.FC<{
  visible: boolean;
  options: CustomAlertOptions;
  onButtonPress: (index: number, button: AlertButton) => void;
  onBackdropPress: () => void;
}> = ({ visible, options, onButtonPress, onBackdropPress }) => {
  const colors = useThemeColors();
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);
  const buttons = options.buttons || [{ text: 'OK' }];
  const showIcon = options.showIcon !== false;

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withTiming(300, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const getIconName = () => {
    if (options.icon) return options.icon;
    const hasDestructive = buttons.some((b) => b.style === 'destructive');
    const hasCancel = buttons.some((b) => b.style === 'cancel');
    if (hasDestructive) return 'alert-circle';
    if (hasCancel && buttons.length === 2) return 'help-circle';
    return 'information';
  };

  const iconColor = buttons.some((b) => b.style === 'destructive')
    ? colors.error
    : colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onBackdropPress}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        ) : null}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onBackdropPress}
        />
      </Animated.View>

      <View style={styles.bottomSheetContainer}>
        <Animated.View
          style={[
            styles.bottomSheet,
            { backgroundColor: colors.surface },
            animatedSheetStyle,
          ]}
        >
          <View style={[styles.handleBar, { backgroundColor: colors.divider }]} />

          {showIcon && (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: iconColor + '15' },
              ]}
            >
              <MaterialCommunityIcons
                name={getIconName()}
                size={48}
                color={iconColor}
              />
            </View>
          )}

          {options.title && (
            <Text style={[styles.title, { color: colors.text }]}>
              {options.title}
            </Text>
          )}

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {options.message}
          </Text>

          <View style={styles.bottomSheetButtonContainer}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.bottomSheetButton,
                    {
                      backgroundColor: isDestructive ? colors.error : colors.primary,
                    },
                    isCancel && {
                      backgroundColor: 'transparent',
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => onButtonPress(index, button)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.bottomSheetButtonText,
                      {
                        color:
                          isCancel || !isDestructive ? colors.primary : '#FFFFFF',
                      },
                      !isCancel && { color: '#FFFFFF' },
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    borderRadius: 24,
    padding: 24,
    width: Math.min(SCREEN_WIDTH - 48, 400),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonHalfWidth: {
    flex: 1,
  },
  buttonMarginRight: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  bottomSheetButtonContainer: {
    gap: 12,
    marginTop: 8,
  },
  bottomSheetButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  bottomSheetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});