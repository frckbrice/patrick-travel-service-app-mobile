import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { secureStorage } from '../storage/secureStorage';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: typeof MD3LightTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#5B7C99',
    secondary: '#7C9885',
    tertiary: '#9B8B7E',
    error: '#C85C5C',
    surface: '#FFFFFF',
    background: '#F5F6F7',
    onSurface: '#2C3E50',
    onBackground: '#2C3E50',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#7A9BB8',
    secondary: '#94B5A0',
    tertiary: '#B5A899',
    error: '#D77C7C',
    surface: '#1E2329',
    background: '#15191E',
    onSurface: '#E8EAED',
    onBackground: '#E8EAED',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');

  const isDark =
    themeMode === 'auto' ? systemColorScheme === 'dark' : themeMode === 'dark';

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await secureStorage.get<ThemeMode>('themeMode');
      if (savedTheme) {
        setThemeModeState(savedTheme);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await secureStorage.set('themeMode', mode);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setThemeMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Export theme-aware colors
export const useThemeColors = () => {
  const { theme, isDark } = useTheme();

  return {
    // Primary Palette
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    accent: theme.colors.tertiary,

    // Status Colors
    error: theme.colors.error,
    success: isDark ? '#6B9E78' : '#6B9E78',
    warning: isDark ? '#D4A574' : '#D4A574',
    info: isDark ? '#7A9BB8' : '#6B8CAE',

    // Neutral Palette
    background: theme.colors.background,
    surface: theme.colors.surface,
    card: isDark ? '#1E2329' : '#FAFBFC',

    // Text Colors
    text: theme.colors.onSurface,
    textSecondary: isDark ? '#A8B2BD' : '#7D8A96',
    textTertiary: isDark ? '#7D8A96' : '#A8B2BD',

    // UI Elements
    border: isDark ? '#2A3038' : '#E1E4E8',
    divider: isDark ? '#252A31' : '#EDF0F2',
    disabled: isDark ? '#3E4852' : '#C4CDD5',
    overlay: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(44, 62, 80, 0.6)',
  };
};
