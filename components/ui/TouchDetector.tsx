import React from 'react';
import { View } from 'react-native';

interface TouchDetectorProps {
  children: React.ReactNode;
}

/**
 * TouchDetector - Now a pass-through component
 * Tab bar visibility is controlled by scroll behavior only (Facebook-like behavior)
 * Removed automatic tab bar show on touch to prevent unwanted reappearance
 */
export const TouchDetector: React.FC<TouchDetectorProps> = ({ children }) => {
  return <View style={{ flex: 1 }}>{children}</View>;
};
