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
    primary: '#0066CC',
    secondary: '#00C853',
    error: '#DC2626',
    surface: '#FFFFFF',
    background: '#F9FAFB',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4A9EFF',
    secondary: '#00E676',
    error: '#EF4444',
    surface: '#1E1E1E',
    background: '#121212',
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
