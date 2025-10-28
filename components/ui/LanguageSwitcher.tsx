import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Menu, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING } from '../../lib/constants';

interface LanguageSwitcherProps {
  style?: any;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ style }) => {
  const { i18n, t } = useTranslation();
  const [menuVisible, setMenuVisible] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setMenuVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      <Text variant="titleMedium" style={styles.label}>
        {t('settings.language')}
      </Text>
      
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.languageButton}
            activeOpacity={0.7}
          >
            <View style={styles.languageContent}>
              <Text style={styles.flagEmoji}>{currentLanguage.flag}</Text>
              <Text style={styles.languageName}>{currentLanguage.name}</Text>
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
        {languages.map((language) => (
          <Menu.Item
            key={language.code}
            onPress={() => changeLanguage(language.code)}
            title={language.name}
            leadingIcon={() => (
              <Text style={styles.menuFlag}>{language.flag}</Text>
            )}
            titleStyle={[
              styles.menuItemTitle,
              i18n.language === language.code && styles.menuItemTitleSelected,
            ]}
            style={[
              styles.menuItem,
              i18n.language === language.code && styles.menuItemSelected,
            ]}
          />
        ))}
      </Menu>
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
  languageButton: {
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
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  flagEmoji: {
    fontSize: 24,
  },
  languageName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
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
  menuFlag: {
    fontSize: 22,
  },
});

