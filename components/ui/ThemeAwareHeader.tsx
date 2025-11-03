import React from 'react';
import { ModernHeader, ModernHeaderProps } from './ModernHeader';
import { LightModernHeader } from './LightModernHeader';
import { useThemeColors } from '../../lib/theme/ThemeContext';

/**
 * ThemeAwareHeader - Conditionally renders the appropriate header
 * based on the current theme mode (light or dark)
 */
export const ThemeAwareHeader: React.FC<ModernHeaderProps> = (props) => {
  const { isDark } = useThemeColors();

  if (isDark) {
    return <ModernHeader {...props} />;
  }

  return <LightModernHeader {...props} />;
};

// Re-export the props type for convenience
export type { ModernHeaderProps } from './ModernHeader';
