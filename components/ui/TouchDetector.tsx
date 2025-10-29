import React, { useEffect } from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';
import { useTabBarContext } from '../../lib/context/TabBarContext';

interface TouchDetectorProps {
  children: React.ReactNode;
}

export const TouchDetector: React.FC<TouchDetectorProps> = ({ children }) => {
  const { showTabBar } = useTabBarContext();

  const handleTouch = () => {
    showTabBar();
  };

  return (
    <TouchableWithoutFeedback onPress={handleTouch}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
};
