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
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { SPACING } from '../../lib/constants';
import Animated, { FadeInDown } from 'react-native-reanimated';

export interface ModernHeaderProps {
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

export const ModernHeader: React.FC<ModernHeaderProps> = ({
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
  gradientColors = ['#3B82F6', '#1D4ED8'],
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

  // Helper function to darken a hex color
  const darkenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * -1);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1).toUpperCase();
  };

  // Adjust gradient colors for better dark mode contrast
  const getAdjustedGradientColors = () => {
    if (!colors.isDark) return gradientColors;
    
    // Check if these are theme colors (light colors that need darkening in dark mode)
    const lightThemeColors = ['#5B7C99', '#7C9885', '#9B8B7E']; // Light theme primary, secondary, tertiary
    const darkThemeColors = ['#7A9BB8', '#94B5A0', '#B5A899']; // Dark theme primary, secondary, tertiary
    
    // If using theme colors in dark mode, darken them significantly for better contrast
    const adjusted = gradientColors.map(color => {
      const upperColor = color.toUpperCase();
      
      // If it's a dark theme color (which are too light), darken it significantly
      if (darkThemeColors.includes(upperColor)) {
        return darkenColor(color, 35); // Darken by 35%
      }
      
      // If it's the default blue gradient, use darker blues
      if (upperColor === '#3B82F6' || upperColor === '#1D4ED8') {
        return darkenColor(color, 30);
      }
      
      // For any other light-looking color in dark mode, darken it
      // Check if color is relatively light (brightness > 50%)
      const num = parseInt(color.replace('#', ''), 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      
      if (brightness > 128) { // If color is light
        return darkenColor(color, 40); // Darken significantly
      }
      
      return color;
    });
    
    return adjusted;
  };

  const renderGradientHeader = () => {
    if (variant !== 'gradient') return null;

    const adjustedGradientColors = getAdjustedGradientColors();

    return (
      <Animated.View 
        entering={FadeInDown.duration(600)} 
        style={[
          styles.gradientContainer,
          {
            shadowColor: '#000',
            shadowOpacity: colors.isDark ? 0.3 : 0.1,
          }
        ]}
      >
        <LinearGradient
          colors={adjustedGradientColors as [string, string, ...string[]]}
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
                    style={styles.backButton}
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
                    style={styles.notificationButton}
                    onPress={onNotificationPress}
                  >
                    <MaterialCommunityIcons name="bell" size={24} color="#FFF" />
                  {notificationCount > 0 && (
                    <View style={[
                      styles.notificationBadge,
                      { borderColor: '#FFF' }
                    ]}>
                      <PaperText style={styles.notificationBadgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </PaperText>
                    </View>
                  )}
                  </TouchableOpacity>
                )}
                {showProfileButton && (
                  <TouchableOpacity
                    style={styles.profileButton}
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
            shadowOpacity: colors.isDark ? 0.3 : 0.08,
          }
        ]}
      >
        <View style={[
          styles.defaultHeader,
          { 
            paddingTop: insets.top + 10,
            backgroundColor: variant === 'transparent' ? 'transparent' : colors.surface,
          }
        ]}>
          <View style={styles.defaultContent}>
            {/* Left Section */}
            <View style={styles.leftSection}>
              {showBackButton && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackPress}
                >
                  <MaterialCommunityIcons 
                    name="arrow-left" 
                    size={24} 
                    color={variant === 'transparent' ? '#FFF' : colors.text} 
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
                  { color: variant === 'transparent' ? '#FFF' : colors.text }
                ]}>
                  {title}
                </PaperText>
              )}
              {subtitle && (
                <PaperText style={[
                  styles.defaultSubtitle,
                  { color: variant === 'transparent' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                ]}>
                  {subtitle}
                </PaperText>
              )}
            </View>

            {/* Right Section */}
            <View style={styles.rightSection}>
              {showNotificationButton && (
                <TouchableOpacity
                  style={styles.notificationButton}
                  onPress={onNotificationPress}
                >
                  <MaterialCommunityIcons 
                    name="bell" 
                    size={24} 
                    color={variant === 'transparent' ? '#FFF' : colors.text} 
                  />
                  {notificationCount > 0 && (
                    <View style={[
                      styles.notificationBadge,
                      { borderColor: colors.isDark ? colors.surface : '#FFF' }
                    ]}>
                      <PaperText style={styles.notificationBadgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </PaperText>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {showProfileButton && (
                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={onProfilePress}
                >
                  <MaterialCommunityIcons 
                    name="account-circle" 
                    size={24} 
                    color={variant === 'transparent' ? '#FFF' : colors.text} 
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
            backgroundColor: variant === 'gradient' 
              ? colors.isDark 
                ? 'rgba(255,255,255,0.15)' 
                : 'rgba(255,255,255,0.2)' 
              : colors.background,
            borderColor: variant === 'gradient' 
              ? colors.isDark 
                ? 'rgba(255,255,255,0.25)' 
                : 'rgba(255,255,255,0.3)' 
              : colors.border,
          }
        ]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={variant === 'gradient' ? '#FFF' : colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder={searchPlaceholder}
            placeholderTextColor={variant === 'gradient' 
              ? colors.isDark 
                ? 'rgba(255,255,255,0.8)' 
                : 'rgba(255,255,255,0.7)' 
              : colors.textSecondary}
            value={searchValue}
            onChangeText={onSearchChange}
            style={[
              styles.searchInput,
              { color: variant === 'gradient' ? '#FFF' : colors.text }
            ]}
          />
          {searchValue.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange?.('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={variant === 'gradient' 
                  ? colors.isDark 
                    ? 'rgba(255,255,255,0.8)' 
                    : 'rgba(255,255,255,0.7)' 
                  : colors.textSecondary}
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
                { backgroundColor: colors.background, borderColor: colors.border }
              ]}
              onPress={onFilterPress}
            >
              <MaterialCommunityIcons
                name="filter-variant"
                size={18}
                color={colors.textSecondary}
                style={{ marginRight: SPACING.xs }}
              />
              <PaperText style={[styles.filterButtonText, { color: colors.textSecondary }]}>
                Filter
              </PaperText>
            </TouchableOpacity>
          )}

          {showAddButton && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
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

  // Get adjusted gradient colors for StatusBar
  const adjustedGradientColors = variant === 'gradient' ? getAdjustedGradientColors() : gradientColors;

  return (
    <>
      <StatusBar
        barStyle={
          variant === 'gradient' || variant === 'transparent' 
            ? 'light-content' 
            : colors.isDark 
              ? 'light-content' 
              : 'dark-content'
        }
        backgroundColor={variant === 'gradient' ? adjustedGradientColors[0] : 'transparent'}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
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
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
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
    minWidth: 56, // Minimum width for back button space
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
    minWidth: 100, // Minimum width for notification + profile buttons
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
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    position: 'relative',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Text Styles
  gradientTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'left',
  },
  gradientSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'left',
    marginTop: 2,
  },
  defaultTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  defaultSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
  },

  // Notification Badge
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FF4757',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  notificationBadgeText: {
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
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
