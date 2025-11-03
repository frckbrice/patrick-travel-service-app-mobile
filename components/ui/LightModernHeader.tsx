import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING } from '../../lib/constants';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '../../lib/theme/ThemeContext';

export interface LightModernHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  showAddButton?: boolean;
  addButtonIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onAddPress?: () => void;
  showFilterButton?: boolean;
  onFilterPress?: () => void;
  showNotificationButton?: boolean;
  notificationCount?: number;
  onNotificationPress?: () => void;
  showProfileButton?: boolean;
  onProfilePress?: () => void;
  rightActions?: React.ReactNode;
  leftActions?: React.ReactNode;
  variant?: 'default' | 'gradient' | 'transparent' | 'minimal';
  gradientColors?: string[];
  children?: React.ReactNode;
  style?: any;
}

export const LightModernHeader: React.FC<LightModernHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  showSearch = false,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  showAddButton = false,
  addButtonIcon = 'plus',
  onAddPress,
  showFilterButton = false,
  onFilterPress,
  showNotificationButton = false,
  notificationCount = 0,
  onNotificationPress,
  showProfileButton = false,
  onProfilePress,
  rightActions,
  leftActions,
  variant = 'default',
  gradientColors = ['#4F7FF7', '#2563EB'],
  children,
  style,
}) => {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  // Lighten gradient colors for light mode
  const getLightGradientColors = () => {
    if (variant !== 'gradient') return gradientColors;
    // Use brighter, more vibrant colors for light mode
    return ['#5B8FFF', '#3B82F6'];
  };

  const renderGradientHeader = () => {
    if (variant !== 'gradient') return null;

    const lightGradientColors = getLightGradientColors();

    return (
      <Animated.View 
        entering={FadeInDown.duration(600)} 
        style={[
          styles.gradientContainer,
          {
            shadowColor: '#2563EB',
            shadowOpacity: 0.15,
          }
        ]}
      >
        <LinearGradient
          colors={lightGradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={[styles.gradientHeader, { paddingTop: insets.top + 10 }]}>
            <View style={styles.gradientContent}>
              {/* Left Section */}
              <View style={styles.leftSection}>
                {showBackButton && (
                  <TouchableOpacity
                    style={styles.gradientBackButton}
                    onPress={handleBackPress}
                  >
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
                  </TouchableOpacity>
                )}
                {leftActions}
              </View>

              {/* Center Section */}
              <View style={styles.centerSection}>
                {title && (
                  <PaperText style={styles.gradientTitle}>{title}</PaperText>
                )}
                {subtitle && (
                  <PaperText style={styles.gradientSubtitle}>{subtitle}</PaperText>
                )}
              </View>

              {/* Right Section */}
              <View style={styles.rightSection}>
                {showNotificationButton && (
                  <TouchableOpacity
                    style={styles.gradientNotificationButton}
                    onPress={onNotificationPress}
                  >
                    <MaterialCommunityIcons name="bell" size={24} color="#FFF" />
                    {notificationCount > 0 && (
                      <View style={styles.gradientNotificationBadge}>
                        <PaperText style={styles.gradientNotificationBadgeText}>
                          {notificationCount > 99 ? '99+' : notificationCount}
                        </PaperText>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                {showProfileButton && (
                  <TouchableOpacity
                    style={styles.gradientProfileButton}
                    onPress={onProfilePress}
                  >
                    <MaterialCommunityIcons name="account-circle" size={24} color="#FFF" />
                  </TouchableOpacity>
                )}
                {rightActions}
              </View>
            </View>
          </View>
        </LinearGradient>
        {children}
      </Animated.View>
    );
  };

  const renderDefaultHeader = () => {
    if (variant === 'gradient') return null;

    return (
      <Animated.View 
        entering={FadeInDown.duration(400)} 
        style={[
          styles.defaultContainer,
          {
            shadowColor: '#000',
            shadowOpacity: 0.06,
            backgroundColor: variant === 'transparent' ? 'transparent' : '#FFFFFF',
          }
        ]}
      >
        <View style={[
          styles.defaultHeader,
          { 
            paddingTop: insets.top + 10,
            backgroundColor: variant === 'transparent' ? 'transparent' : '#FFFFFF',
          }
        ]}>
          <View style={styles.defaultContent}>
            {/* Left Section */}
            <View style={styles.leftSection}>
              {showBackButton && (
                <TouchableOpacity
                  style={[
                    styles.backButton,
                    { backgroundColor: '#F5F6F7' }
                  ]}
                  onPress={handleBackPress}
                >
                  <MaterialCommunityIcons 
                    name="arrow-left" 
                    size={22} 
                    color={variant === 'transparent' ? '#FFF' : '#2C3E50'} 
                  />
                </TouchableOpacity>
              )}
              {leftActions}
            </View>

            {/* Center Section */}
            <View style={styles.centerSection}>
              {title && (
                <PaperText style={[
                  styles.defaultTitle,
                  { color: variant === 'transparent' ? '#FFF' : '#1A1F2E' }
                ]}>
                  {title}
                </PaperText>
              )}
              {subtitle && (
                <PaperText style={[
                  styles.defaultSubtitle,
                  { color: variant === 'transparent' ? 'rgba(255,255,255,0.9)' : '#6B7280' }
                ]}>
                  {subtitle}
                </PaperText>
              )}
            </View>

            {/* Right Section */}
            <View style={styles.rightSection}>
              {showNotificationButton && (
                <TouchableOpacity
                  style={[
                    styles.notificationButton,
                    { backgroundColor: '#F5F6F7' }
                  ]}
                  onPress={onNotificationPress}
                >
                  <MaterialCommunityIcons 
                    name="bell" 
                    size={22} 
                    color={variant === 'transparent' ? '#FFF' : '#2C3E50'} 
                  />
                  {notificationCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <PaperText style={styles.notificationBadgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </PaperText>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {showProfileButton && (
                <TouchableOpacity
                  style={[
                    styles.profileButton,
                    { backgroundColor: '#F5F6F7' }
                  ]}
                  onPress={onProfilePress}
                >
                  <MaterialCommunityIcons 
                    name="account-circle" 
                    size={22} 
                    color={variant === 'transparent' ? '#FFF' : '#2C3E50'} 
                  />
                </TouchableOpacity>
              )}
              {rightActions}
            </View>
          </View>
        </View>
        {children}
      </Animated.View>
    );
  };

  const renderSearchBar = () => {
    if (!showSearch) return null;

    return (
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.searchContainer, { paddingTop: SPACING.sm }]}>
        <View style={[
          styles.searchBar,
          { 
            // In light mode, ensure strong contrast on gradient headers too
            backgroundColor: variant === 'gradient' 
              ? '#FFFFFF' 
              : '#F9FAFB',
            borderColor: variant === 'gradient' 
              ? '#E5E7EB' 
              : '#E5E7EB',
          }
        ]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={variant === 'gradient' ? '#6B7280' : '#6B7280'}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder={searchPlaceholder}
            placeholderTextColor={variant === 'gradient' 
              ? '#9CA3AF' 
              : '#9CA3AF'}
            value={searchValue}
            onChangeText={onSearchChange}
            style={[
              styles.searchInput,
              { color: variant === 'gradient' ? '#1A1F2E' : '#1A1F2E' }
            ]}
            selectionColor={'#2563EB'}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchValue.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange?.('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={variant === 'gradient' 
                  ? '#9CA3AF' 
                  : '#9CA3AF'}
              />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderActionBar = () => {
    if (!showAddButton && !showFilterButton) return null;

    return (
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.actionBar}>
        <View style={styles.actionBarContent}>
          {showFilterButton && (
            <TouchableOpacity
              style={[
                styles.filterButton,
                { 
                  backgroundColor: '#FFFFFF', 
                  borderColor: '#E5E7EB',
                  shadowColor: '#000',
                  shadowOpacity: 0.03,
                }
              ]}
              onPress={onFilterPress}
            >
              <MaterialCommunityIcons
                name="filter-variant"
                size={18}
                color="#6B7280"
                style={{ marginRight: SPACING.xs }}
              />
              <PaperText style={[styles.filterButtonText, { color: '#6B7280' }]}>
                Filter
              </PaperText>
            </TouchableOpacity>
          )}

          {showAddButton && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#2563EB' }]}
              onPress={onAddPress}
            >
              <MaterialCommunityIcons
                name={addButtonIcon}
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const lightGradientColors = variant === 'gradient' ? getLightGradientColors() : gradientColors;

  return (
    <>
      <StatusBar
        barStyle={
          variant === 'gradient' || variant === 'transparent' 
            ? 'light-content' 
            : 'dark-content'
        }
        backgroundColor={variant === 'gradient' ? lightGradientColors[0] : 'transparent'}
      />
      {renderGradientHeader()}
      {renderDefaultHeader()}
      {renderSearchBar()}
      {renderActionBar()}
    </>
  );
};

const styles = StyleSheet.create({
  // Gradient Header Styles
  gradientContainer: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  gradientBackground: {
    width: '100%',
  },
  gradientHeader: {
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  gradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Default Header Styles
  defaultContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  defaultHeader: {
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  defaultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Common Layout Styles
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0,
    minWidth: 56,
  },
  centerSection: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0,
    justifyContent: 'flex-end',
    minWidth: 100,
  },

  // Button Styles
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  gradientBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    position: 'relative',
  },
  gradientNotificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  gradientProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },

  // Text Styles
  gradientTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'left',
    letterSpacing: -0.3,
  },
  gradientSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'left',
    marginTop: 2,
    fontWeight: '500',
  },
  defaultTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: -0.2,
  },
  defaultSubtitle: {
    fontSize: 13,
    textAlign: 'left',
    marginTop: 2,
    fontWeight: '500',
  },

  // Notification Badge
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  gradientNotificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  gradientNotificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Search Bar Styles
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },

  // Action Bar Styles
  actionBar: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  actionBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
