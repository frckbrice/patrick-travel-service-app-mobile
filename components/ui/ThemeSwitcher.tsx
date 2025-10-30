import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Menu, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme/ThemeContext';
import { COLORS, SPACING } from '../../lib/constants';

interface ThemeSwitcherProps {
  style?: any;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ style }) => {
  const { t } = useTranslation();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  const themes = [
    { 
      mode: 'light' as const, 
      name: t('settings.lightMode'), 
      description: t('settings.lightDesc'),
      icon: 'weather-sunny'
    },
    { 
      mode: 'dark' as const, 
      name: t('settings.darkMode'), 
      description: t('settings.darkDesc'),
      icon: 'weather-night'
    },
    { 
      mode: 'auto' as const, 
      name: t('settings.autoMode'), 
      description: t('settings.autoDesc'),
      icon: 'theme-light-dark'
    },
  ];

  const currentTheme = themes.find(theme => theme.mode === themeMode) || themes[2];

  const changeTheme = (mode: 'light' | 'dark' | 'auto') => {
    setThemeMode(mode);
    setMenuVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      <Text variant="titleMedium" style={styles.label}>
        {t('settings.appearance')}
      </Text>
      
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.themeButton}
            activeOpacity={0.7}
          >
            <View style={styles.themeContent}>
              <MaterialCommunityIcons
                name={currentTheme.icon as any}
                size={24}
                color={COLORS.primary}
              />
              <View style={styles.themeTextContainer}>
                <Text style={styles.themeName}>{currentTheme.name}</Text>
                <Text style={styles.themeDescription}>{currentTheme.description}</Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name={menuVisible ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        }
        contentStyle={styles.menuContent}
      >
        {themes.map((theme) => (
          <Menu.Item
            key={theme.mode}
            onPress={() => changeTheme(theme.mode)}
            title={theme.name}
            description={theme.description}
            leadingIcon={() => (
              <MaterialCommunityIcons
                name={theme.icon as any}
                size={20}
                color={themeMode === theme.mode ? COLORS.primary : COLORS.textSecondary}
              />
            )}
            titleStyle={[
              styles.menuItemTitle,
              themeMode === theme.mode && styles.menuItemTitleSelected,
            ]}
            descriptionStyle={styles.menuItemDescription}
            style={[
              styles.menuItem,
              themeMode === theme.mode && styles.menuItemSelected,
            ]}
          />
        ))}
      </Menu>
      
      <Text variant="bodySmall" style={styles.note}>
        {t('settings.darkModeNote')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    marginBottom: SPACING.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  themeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  themeTextContainer: {
    flex: 1,
  },
  themeName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  themeDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuItem: {
    paddingVertical: SPACING.sm,
  },
  menuItemSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  menuItemTitle: {
    fontSize: 15,
    color: COLORS.text,
  },
  menuItemTitleSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  menuItemDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  note: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

